jest.mock("../../../../src/framework/bean/Service", () => () => (target) => target);
jest.mock("../../../../src/store/AppStore", () => ({__esModule: true, default: {}}));
jest.mock("../../../../src/framework/db/RealmFactory", () => ({__esModule: true, default: {}}));
jest.mock('react-native-randombytes', () => ({
    randomBytes: (n, cb) => { const b = new Uint8Array(n || 16); if (cb) cb(null, b); return b; },
}));
jest.mock('react-native-keychain', () => ({
    getGenericPassword: jest.fn(async () => false), setGenericPassword: jest.fn(async () => {}), resetGenericPassword: jest.fn(async () => {}),
}));

import {Individual, ModelGeneral} from "openchs-models";
import EntityService from "../../../../src/service/EntityService";
import RepositoryFactory from "../../../../src/repository/RepositoryFactory";
import SqliteRowMapper from "../../../../src/framework/db/SqliteRowMapper";
import {openSeededDb} from "./lazyFixture";
import {EXTRA_SEED, PLACEHOLDER_ADDRESS_UUID, REPEATED_GROUP, individualResource, without} from "./syncResourceFixtures";

const MODELS = {Individual};

describe("A row built straight from the download", () => {
    let db, entityService, mapper;

    beforeEach(() => {
        db = openSeededDb(EXTRA_SEED);
        entityService = new EntityService(db.proxy, {getRepositoryFactory: () => new RepositoryFactory(db.proxy), getService: () => undefined});
        mapper = new SqliteRowMapper(db.proxy.realmSchemaMap, entityService);
    });

    afterEach(() => db.rawDb.close());

    // Today's row for the same download: fromResource, with its parent lookups, then flatten.
    const today = (schema, resource) => db.hydrator.flatten(schema, MODELS[schema].fromResource(resource, entityService));
    const direct = (schema, resource) => mapper.mapResourceToRow(schema, resource);
    const sameAsToday = (schema, makeResource) => expect(direct(schema, makeResource())).toEqual(today(schema, makeResource()));
    const keepsMissingParent = (schema, makeResource, column, uuid) => {
        const todayRow = today(schema, makeResource());
        expect(todayRow[column]).toBeNull();
        expect(direct(schema, makeResource())).toEqual({...todayRow, [column]: uuid});
    };

    describe("for a subject", () => {
        it("matches today's row for a full record", () =>
            sameAsToday("Individual", () => individualResource()));

        it("matches today's row when optional fields are missing from the download", () =>
            sameAsToday("Individual", () => without(individualResource(), "middleName", "lastName", "profilePicture", "dateOfBirth",
                "dateOfBirthVerified", "voided", "observations", "registrationLocation", "subjectLocation")));

        it("matches today's row when optional fields are null instead of missing", () =>
            sameAsToday("Individual", () => individualResource({middleName: null, lastName: null, profilePicture: null, dateOfBirth: null,
                dateOfBirthVerified: null, voided: null, observations: null, registrationLocation: null, subjectLocation: null})));

        it("matches today's row when some links are missing", () =>
            sameAsToday("Individual", () => individualResource({}, {genderUUID: undefined, createdBy: undefined, createdByUUID: undefined,
                lastModifiedBy: undefined, lastModifiedByUUID: undefined})));

        it("matches today's row when the download has no links at all", () =>
            sameAsToday("Individual", () => without(individualResource(), "_links")));

        it("matches today's row for answers in a repeated question group", () =>
            sameAsToday("Individual", () => individualResource({observations: REPEATED_GROUP})));

        it("gives a household and a user their full name, as today", () => {
            sameAsToday("Individual", () => individualResource({}, {subjectTypeUUID: "st-household"}));
            sameAsToday("Individual", () => individualResource({}, {subjectTypeUUID: "st-user", addressUUID: undefined}));
        });

        it("writes no address for the placeholder address, as today", () => {
            sameAsToday("Individual", () => individualResource({}, {subjectTypeUUID: "st-user", addressUUID: PLACEHOLDER_ADDRESS_UUID}));
            sameAsToday("Individual", () => individualResource({}, {addressUUID: PLACEHOLDER_ADDRESS_UUID}));
        });

        it("keeps the uuid of an address that is not on the phone, where today's row leaves it empty", () =>
            keepsMissingParent("Individual", () => individualResource({}, {addressUUID: "al-elsewhere"}), "lowest_address_level_uuid", "al-elsewhere"));

        it("never writes the latest approval link, which only the phone keeps (INV-026)", () =>
            expect(direct("Individual", individualResource())).not.toHaveProperty("latest_entity_approval_status_uuid"));

        it("stores answers through the models' own answer handling, so any answer type is stored as today", () => {
            const spy = jest.spyOn(ModelGeneral, "assignObsFields");
            direct("Individual", individualResource());
            // The holder is filled in by the call, and jest keeps a reference to it, so match it loosely.
            expect(spy).toHaveBeenCalledWith(expect.objectContaining({uuid: "ind-new"}), expect.any(Object), ["observations"], entityService);
            spy.mockRestore();
        });
    });

    it("refuses a kind of record it has no row plan for", () =>
        expect(() => direct("GroupSubject", {})).toThrow(/no row plan for "GroupSubject"/));
});
