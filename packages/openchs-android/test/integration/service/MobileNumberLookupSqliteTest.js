/**
 * Finding subjects by mobile number on the on-device database: the questions marked as a
 * contact number are looked up first, so the subject query matches on their uuids in SQL.
 * Each case is checked against the earlier query, which matched on the questions' keyValues.
 *
 * Run: npx jest --selectProjects integration --testPathPattern MobileNumberLookupSqliteTest
 */
import {assert} from "chai";
import _ from "lodash";

jest.mock("../../../src/framework/bean/Service", () => () => (target) => target);

import {Concept, EntityMappingConfig, KeyValue} from "openchs-models";
import SchemaGenerator from "../../../src/framework/db/SchemaGenerator";
import SqliteProxy from "../../../src/framework/db/SqliteProxy";
import RepositoryFactory from "../../../src/repository/RepositoryFactory";
import IndividualService from "../../../src/service/IndividualService";
import ConceptService from "../../../src/service/ConceptService";
import CustomFilterService from "../../../src/service/CustomFilterService";
import PrivilegeService from "../../../src/service/PrivilegeService";
import {open} from "@op-engineering/op-sqlite";

const PHONE = "c-phone";        // PhoneNumber question marked primary_contact
const CONTACT = "c-contact";    // Text question marked contact_number
const NOT_CONTACT = "c-other";  // Text question marked contact_number = no
const NOTES = "c-notes";        // Text question with no contact key
const PERSON = "st-person";
const HOUSEHOLD = "st-household";

const phoneAnswer = (concept, phoneNumber) => ({
    concept: {uuid: concept},
    valueJSON: JSON.stringify({phoneNumber, verified: false})
});
const textAnswer = (concept, text) => ({concept: {uuid: concept}, valueJSON: JSON.stringify({answer: text})});

function earlierLookup(service, mobileNumber, subjectTypeUUID = null) {
    const toMatchMobileNumber = _.toString(mobileNumber).slice(-10);
    const allSubjects = subjectTypeUUID ? service.getAllBySubjectTypeUUID(subjectTypeUUID) : service.getAllNonVoided();
    return allSubjects
        .filtered(`(observations.concept.keyValues.key = "${KeyValue.PrimaryContactKey}" or observations.concept.keyValues.key = "${KeyValue.ContactNumberKey}") and (observations.valueJSON CONTAINS "${toMatchMobileNumber}")`)
        .filter(subject => _.toString(subject.getMobileNumber()).slice(-10) === toMatchMobileNumber);
}

function setUp(withContactQuestions = true) {
    const rawDb = open({});
    const cfg = EntityMappingConfig.getInstance();
    const tableMetaMap = SchemaGenerator.generateAll(cfg);
    const realmSchemaMap = SchemaGenerator.buildRealmSchemaMap(cfg);
    rawDb.executeSync("PRAGMA foreign_keys = OFF");
    for (const sql of SchemaGenerator.generateCreateTableStatements(tableMetaMap)) rawDb.executeSync(sql);
    for (const sql of SchemaGenerator.generateIndexStatements(tableMetaMap)) rawDb.executeSync(sql);
    const proxy = new SqliteProxy(rawDb, cfg, tableMetaMap, realmSchemaMap);

    proxy.write(() => {
        const create = (schema, data) => proxy.create(schema, data, true, {skipHydration: true});
        const concept = (uuid, datatype, keyValues) => create("Concept", {uuid, name: uuid, datatype, voided: false, active: true, keyValues});
        concept(PHONE, Concept.dataType.PhoneNumber, withContactQuestions ? [{key: KeyValue.PrimaryContactKey, value: KeyValue.ContactYesValue}] : []);
        concept(CONTACT, Concept.dataType.Text, withContactQuestions ? [{key: KeyValue.ContactNumberKey, value: KeyValue.ContactYesValue}] : []);
        concept(NOT_CONTACT, Concept.dataType.Text, [{key: KeyValue.ContactNumberKey, value: "no"}]);
        concept(NOTES, Concept.dataType.Text, []);
        create("SubjectType", {uuid: PERSON, name: "Person", voided: false, active: true, type: "Person"});
        create("SubjectType", {uuid: HOUSEHOLD, name: "Household", voided: false, active: true, type: "Household"});
        const subject = (uuid, observations, extra = {}) => create("Individual", {
            uuid, firstName: uuid, registrationDate: new Date(2026, 0, 1), voided: false,
            subjectType: {uuid: PERSON}, observations, ...extra
        });
        subject("on-phone", [phoneAnswer(PHONE, "9876543210")]);
        subject("on-contact", [textAnswer(CONTACT, "9123456789")]);
        subject("with-code", [phoneAnswer(PHONE, "+919988776655")]);
        subject("not-a-contact", [textAnswer(NOT_CONTACT, "9000000001")]);
        subject("in-notes", [textAnswer(NOTES, "9000000002")]);
        subject("voided", [phoneAnswer(PHONE, "9000000003")], {voided: true});
        subject("household", [phoneAnswer(PHONE, "9000000004")], {subjectType: {uuid: HOUSEHOLD}});
        subject("person-same-number", [phoneAnswer(PHONE, "9000000004")]);
    });

    const repositoryFactory = new RepositoryFactory(proxy);
    const context = {getRepositoryFactory: () => repositoryFactory, getService: (klass) => services.get(klass)};
    const services = new Map([
        [CustomFilterService, {}],
        [PrivilegeService, {hasAllPrivileges: () => true, allowedEntityTypeUUIDListForCriteria: () => []}],
    ]);
    services.set(ConceptService, new ConceptService(proxy, context));
    return {rawDb, service: new IndividualService(proxy, context)};
}

describe("finding subjects by mobile number on SQLite", () => {
    let rawDb, service;

    beforeEach(() => ({rawDb, service} = setUp()));
    afterEach(() => rawDb && rawDb.close());

    const found = (mobileNumber, subjectTypeUUID) => {
        const now = service.findAllWithMobileNumber(mobileNumber, subjectTypeUUID).map(s => s.uuid);
        assert.sameMembers(now, earlierLookup(service, mobileNumber, subjectTypeUUID).map(s => s.uuid),
            "same subjects as the earlier query");
        return now;
    };

    it("finds a subject by a phone question marked primary_contact", () => {
        assert.sameMembers(found("9876543210"), ["on-phone"]);
    });

    it("finds a subject by a text question marked contact_number", () => {
        assert.sameMembers(found("9123456789"), ["on-contact"]);
    });

    it("finds a number stored with +91 when searched without it", () => {
        assert.sameMembers(found("9988776655"), ["with-code"]);
    });

    it("finds a number when searched with +91", () => {
        assert.sameMembers(found("+919876543210"), ["on-phone"]);
    });

    it("does not find a number in a question whose contact key is 'no'", () => {
        assert.sameMembers(found("9000000001"), []);
    });

    it("does not find a number in a question that is not a contact number", () => {
        assert.sameMembers(found("9000000002"), []);
    });

    it("does not return a voided subject", () => {
        assert.sameMembers(found("9000000003"), []);
    });

    it("runs the subject query in SQL, without the JS fallback", () => {
        const subjects = service.getAllNonVoided();
        let built;
        const filtered = subjects.filtered.bind(subjects);
        subjects.filtered = (...args) => (built = filtered(...args));
        service.getAllNonVoided = () => subjects;

        assert.sameMembers(service.findAllWithMobileNumber("9876543210").map(s => s.uuid), ["on-phone"]);
        assert.deepEqual(built.jsFallbackFilters, []);
    });

    [undefined, null, ""].forEach(mobileNumber => {
        it(`finds no one for the number ${JSON.stringify(mobileNumber)}`, () => {
            assert.sameMembers(service.findAllWithMobileNumber(mobileNumber).map(s => s.uuid), []);
        });
    });

    it("returns only the given subject type", () => {
        assert.sameMembers(found("9000000004", PERSON), ["person-same-number"]);
        assert.sameMembers(found("9000000004", HOUSEHOLD), ["household"]);
        assert.sameMembers(found("9000000004"), ["household", "person-same-number"]);
    });
});

describe("finding subjects by mobile number when no question is a contact number", () => {
    it("finds no one", () => {
        const {rawDb, service} = setUp(false);
        try {
            assert.sameMembers(service.findAllWithMobileNumber("9876543210").map(s => s.uuid), []);
            assert.sameMembers(earlierLookup(service, "9876543210").map(s => s.uuid), []);
        } finally {
            rawDb.close();
        }
    });
});
