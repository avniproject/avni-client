jest.mock("../../../../src/framework/bean/Service", () => () => (target) => target);
jest.mock("../../../../src/store/AppStore", () => ({__esModule: true, default: {}}));
jest.mock("../../../../src/framework/db/RealmFactory", () => ({__esModule: true, default: {}}));
jest.mock('react-native-randombytes', () => ({
    randomBytes: (n, cb) => { const b = new Uint8Array(n || 16); if (cb) cb(null, b); return b; },
}));
jest.mock('react-native-keychain', () => ({
    getGenericPassword: jest.fn(async () => false), setGenericPassword: jest.fn(async () => {}), resetGenericPassword: jest.fn(async () => {}),
}));

import {Checklist, ChecklistItem, Encounter, EntityApprovalStatus, Individual, IndividualRelationship, ModelGeneral,
    ProgramEncounter, ProgramEnrolment} from "openchs-models";
import EntityService from "../../../../src/service/EntityService";
import RepositoryFactory from "../../../../src/repository/RepositoryFactory";
import SqliteRowMapper, {COPIED_FROM_MODELS_VERSION, DIRECT_ROW_SCHEMAS} from "../../../../src/framework/db/SqliteRowMapper";
import {openSeededDb} from "./lazyFixture";
import {EXTRA_SEED, PLACEHOLDER_ADDRESS_UUID, REPEATED_GROUP, approvalResource, cancelledEncounterResource, checklistItemResource,
    checklistResource, encounterResource, enrolmentResource, individualResource, programEncounterResource, relationshipResource,
    without} from "./syncResourceFixtures";

const MODELS = {Individual, ProgramEnrolment, Encounter, ProgramEncounter, IndividualRelationship, Checklist, ChecklistItem, EntityApprovalStatus};

// The sources in avni-models that SqliteRowMapper copies (paths at v1.33.86).
const COPIED_MODEL_SOURCES = ["src/Individual.js", "src/ProgramEnrolment.js", "src/Encounter.js", "src/ProgramEncounter.js", "src/AbstractEncounter.js",
    "src/relationship/IndividualRelationship.js", "src/Checklist.js", "src/ChecklistItem.js", "src/EntityApprovalStatus.js",
    "src/utility/General.js", "src/utility/AuditUtil.js", "src/utility/ResourceUtil.js", "src/geo/Point.js", "src/SubjectLocation.js"];

// A tripwire, not a pin: the pins below compare the mapper's rows with today's for the shapes written here, so a change in a
// new models release that none of those shapes reaches would pass them and leave wrong rows on phones until a reset sync.
it("is copied from the openchs-models version the app installs", () => {
    const installed = require("openchs-models/package.json").version;
    if (installed === COPIED_FROM_MODELS_VERSION) return;
    throw new Error(
        `The app installs openchs-models ${installed}, but SqliteRowMapper was copied from ${COPIED_FROM_MODELS_VERSION}.\n` +
        "SqliteRowMapper copies the fromResource of Individual, ProgramEnrolment, Encounter and ProgramEncounter (AbstractEncounter), " +
        "IndividualRelationship, Checklist, ChecklistItem and EntityApprovalStatus, plus General.assignFields / assignObsFields, " +
        "AuditUtil.mapAuditFields, ResourceUtil.getFieldValue, Point.fromResource and SubjectLocation.fromResource.\n" +
        `Diff those files in avni-models between v${COPIED_FROM_MODELS_VERSION} and v${installed}:\n` +
        `    git -C ../avni-models diff v${COPIED_FROM_MODELS_VERSION} v${installed} -- ${COPIED_MODEL_SOURCES.join(" ")}\n` +
        `If any of them changed, update SPECS in SqliteRowMapper.js to match. Then set COPIED_FROM_MODELS_VERSION to "${installed}".`);
});

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
    // Strict: toEqual treats a key set to undefined as absent, and SqliteProxy writes every column whose key is present (INV-026).
    const sameAsToday = (schema, makeResource) => expect(direct(schema, makeResource())).toStrictEqual(today(schema, makeResource()));
    const keepsMissingParent = (schema, makeResource, column, uuid) => {
        const todayRow = today(schema, makeResource());
        expect(todayRow[column]).toBeNull();
        expect(direct(schema, makeResource())).toStrictEqual({...todayRow, [column]: uuid});
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
            expect(direct("Individual", individualResource({}, {subjectTypeUUID: "st-user", addressUUID: PLACEHOLDER_ADDRESS_UUID})).lowest_address_level_uuid).toBeNull();
            expect(direct("Individual", individualResource({}, {addressUUID: PLACEHOLDER_ADDRESS_UUID})).lowest_address_level_uuid).toBeNull();
        });

        it("keeps the uuid of an address that is not on the phone, where today's row leaves it empty", () =>
            keepsMissingParent("Individual", () => individualResource({}, {addressUUID: "al-elsewhere"}), "lowest_address_level_uuid", "al-elsewhere"));

        it("writes no address for a user whose address is not on the phone, as today", () => {
            sameAsToday("Individual", () => individualResource({}, {subjectTypeUUID: "st-user", addressUUID: "al-elsewhere"}));
            expect(direct("Individual", individualResource({}, {subjectTypeUUID: "st-user", addressUUID: "al-elsewhere"})).lowest_address_level_uuid).toBeNull();
        });

        it("keeps a user's address that is on the phone, as today", () => {
            sameAsToday("Individual", () => individualResource({}, {subjectTypeUUID: "st-user"}));
            expect(direct("Individual", individualResource({}, {subjectTypeUUID: "st-user"})).lowest_address_level_uuid).toBe("al-village");
        });

        it("looks up an address only for a user subject that has one", () => {
            const lookups = jest.spyOn(entityService, "findByKey");
            const addressLookups = () => lookups.mock.calls.filter(([, , schemaName]) => schemaName === "AddressLevel").length;
            direct("Individual", individualResource());
            direct("Individual", individualResource({}, {subjectTypeUUID: "st-household"}));
            direct("Individual", individualResource({}, {subjectTypeUUID: "st-user", addressUUID: undefined}));
            expect(addressLookups()).toBe(0);
            direct("Individual", individualResource({}, {subjectTypeUUID: "st-user"}));
            expect(addressLookups()).toBe(1);
            lookups.mockRestore();
        });

        it("keeps the uuid of a gender or a subject type that is not on the phone", () => {
            keepsMissingParent("Individual", () => individualResource({}, {genderUUID: "g-elsewhere"}), "gender_uuid", "g-elsewhere");
            keepsMissingParent("Individual", () => individualResource({}, {subjectTypeUUID: "st-elsewhere"}), "subject_type_uuid", "st-elsewhere");
        });

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

    describe("for an enrolment", () => {
        it("matches today's row for a full record", () =>
            sameAsToday("ProgramEnrolment", () => enrolmentResource()));

        it("matches today's row for an exited enrolment with exit answers", () =>
            sameAsToday("ProgramEnrolment", () => enrolmentResource({programExitDateTime: "2026-09-20T10:00:00.000Z",
                programExitObservations: {"c-note": "moved"}, exitLocation: {x: 77.6, y: 12.9}})));

        it("matches today's row when optional fields are missing from the download", () =>
            sameAsToday("ProgramEnrolment", () => without(enrolmentResource(), "programExitDateTime", "observations",
                "programExitObservations", "enrolmentLocation", "voided")));

        it("keeps the uuid of a subject that is not on the phone", () =>
            keepsMissingParent("ProgramEnrolment", () => enrolmentResource({}, {individualUUID: "ind-elsewhere"}), "individual_uuid", "ind-elsewhere"));
    });

    describe("for a visit", () => {
        it("matches today's row for a full record", () =>
            sameAsToday("Encounter", () => encounterResource()));

        it("matches today's row for a cancelled visit with cancel answers", () =>
            sameAsToday("Encounter", () => cancelledEncounterResource()));

        it("matches today's row for a scheduled visit not yet done", () =>
            sameAsToday("Encounter", () => without(encounterResource({encounterDateTime: null}), "observations", "encounterLocation")));

        it("matches today's row when the filled-by links are missing", () =>
            sameAsToday("Encounter", () => encounterResource({}, {filledBy: undefined, filledByUUID: undefined})));

        it("keeps the uuid of a subject that is not on the phone", () =>
            keepsMissingParent("Encounter", () => encounterResource({}, {individualUUID: "ind-elsewhere"}), "individual_uuid", "ind-elsewhere"));
    });

    describe("for a program visit", () => {
        it("matches today's row for a full record", () =>
            sameAsToday("ProgramEncounter", () => programEncounterResource()));

        it("matches today's row for a cancelled program visit", () =>
            sameAsToday("ProgramEncounter", () => cancelledEncounterResource({uuid: "pe-new"}, {individualUUID: undefined, programEnrolmentUUID: "enl-1"})));

        it("keeps the uuid of an enrolment that is not on the phone", () =>
            keepsMissingParent("ProgramEncounter", () => programEncounterResource({}, {programEnrolmentUUID: "enl-elsewhere"}),
                "program_enrolment_uuid", "enl-elsewhere"));
    });

    describe("for a relationship", () => {
        it("matches today's row for a full record", () =>
            sameAsToday("IndividualRelationship", () => relationshipResource()));

        it("matches today's row for an ended relationship", () =>
            sameAsToday("IndividualRelationship", () => relationshipResource({exitDateTime: "2026-09-10T10:00:00.000Z"})));

        it("writes no exit answers column, as today", () => {
            expect(today("IndividualRelationship", relationshipResource())).not.toHaveProperty("exit_observations");
            expect(direct("IndividualRelationship", relationshipResource())).not.toHaveProperty("exit_observations");
        });

        it("keeps the uuid of a second subject that is not on the phone", () =>
            keepsMissingParent("IndividualRelationship", () => relationshipResource({}, {individualBUUID: "ind-elsewhere"}),
                "individual_b_uuid", "ind-elsewhere"));
    });

    describe("for a checklist", () => {
        it("matches today's row for a full record", () =>
            sameAsToday("Checklist", () => checklistResource()));

        it("writes no answers column, as today", () =>
            expect(direct("Checklist", checklistResource())).not.toHaveProperty("observations"));

        it("keeps the uuid of an enrolment that is not on the phone", () =>
            keepsMissingParent("Checklist", () => checklistResource({}, {programEnrolmentUUID: "enl-elsewhere"}), "program_enrolment_uuid", "enl-elsewhere"));

        it("keeps the uuid of a checklist definition that is not on the phone", () =>
            keepsMissingParent("Checklist", () => checklistResource({}, {checklistDetailUUID: "cd-elsewhere"}), "detail_uuid", "cd-elsewhere"));
    });

    describe("for a checklist item", () => {
        it("matches today's row for a full record", () =>
            sameAsToday("ChecklistItem", () => checklistItemResource()));

        it("matches today's row for an item not yet completed", () =>
            sameAsToday("ChecklistItem", () => without(checklistItemResource({completionDate: null}), "observations")));

        it("keeps the uuid of a checklist that is not on the phone", () =>
            keepsMissingParent("ChecklistItem", () => checklistItemResource({}, {checklistUUID: "cl-elsewhere"}), "checklist_uuid", "cl-elsewhere"));
    });

    describe("for an approval", () => {
        it("matches today's row for a full record", () =>
            sameAsToday("EntityApprovalStatus", () => approvalResource()));

        it("matches today's row when the download has no answers", () =>
            sameAsToday("EntityApprovalStatus", () => without(approvalResource(), "observations")));

        it("takes the approved record's uuid from the download", () =>
            expect(direct("EntityApprovalStatus", approvalResource({}, {entityUUID: "enc-1a"})).entity_uuid).toBe("enc-1a"));

        it("keeps the uuid of an approval status that is not on the phone", () =>
            keepsMissingParent("EntityApprovalStatus", () => approvalResource({}, {approvalStatusUUID: "as-elsewhere"}),
                "approval_status_uuid", "as-elsewhere"));
    });

    it("covers exactly the eight bulky kinds of record", () =>
        expect([...DIRECT_ROW_SCHEMAS].sort()).toEqual(["Checklist", "ChecklistItem", "Encounter", "EntityApprovalStatus",
            "Individual", "IndividualRelationship", "ProgramEncounter", "ProgramEnrolment"]));

    it("refuses a kind of record it has no row plan for", () =>
        expect(() => direct("GroupSubject", {})).toThrow(/no row plan for "GroupSubject"/));

    it("refuses to be built without an entity service, which answers are stored through", () =>
        expect(() => new SqliteRowMapper(db.proxy.realmSchemaMap, undefined)).toThrow(/needs an entity service/));
});
