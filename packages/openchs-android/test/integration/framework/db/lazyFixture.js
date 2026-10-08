import {EntityMappingConfig} from "openchs-models";
import SchemaGenerator from "../../../../src/framework/db/SchemaGenerator";
import SqliteProxy from "../../../../src/framework/db/SqliteProxy";
import {open} from "@op-engineering/op-sqlite";

const at = new Date("2026-09-01T10:00:00.000Z");
const weight = (kg) => [{concept: {uuid: "c-weight"}, valueJSON: JSON.stringify({answer: kg})}];

export const SEED = [
    ["Gender", {uuid: "g-f", name: "Female", voided: false}],
    ["SubjectType", {uuid: "st-person", name: "Person", type: "Person", voided: false}],
    ["SubjectType", {uuid: "st-household", name: "Household", type: "Household", group: true, household: true, voided: false}],
    ["SubjectType", {uuid: "st-user", name: "User", type: "User", voided: false}],
    ["EncounterType", {uuid: "et-visit", name: "Visit", voided: false}],
    ["Program", {uuid: "pr-mother", name: "Mother", voided: false}],
    ["Concept", {uuid: "c-weight", name: "Weight", datatype: "Numeric", voided: false}],
    ["GroupRole", {uuid: "gr-member", role: "Member", voided: false}],
    ["ApprovalStatus", {uuid: "as-approved", status: "Approved", voided: false}],
    ["IndividualRelationshipType", {uuid: "rt-spouse", name: "Spouse", voided: false}],
    ["Individual", {uuid: "ind-1", firstName: "Asha", subjectType: {uuid: "st-person"}, gender: {uuid: "g-f"}, registrationDate: at, voided: false, observations: weight(50)}],
    ["Individual", {uuid: "ind-2", firstName: "Bina", subjectType: {uuid: "st-person"}, gender: {uuid: "g-f"}, registrationDate: at, voided: false, observations: []}],
    ["Individual", {uuid: "ind-hh", firstName: "Home", subjectType: {uuid: "st-household"}, registrationDate: at, voided: false, observations: []}],
    ["Individual", {uuid: "ind-user", firstName: "Worker", subjectType: {uuid: "st-user"}, registrationDate: at, voided: false, observations: []}],
    ["EntityApprovalStatus", {uuid: "eas-1a", entityUUID: "enc-1a", entityType: "Encounter", approvalStatus: {uuid: "as-approved"}, statusDateTime: at, voided: false, observations: []}],
    ["Encounter", {uuid: "enc-1a", encounterType: {uuid: "et-visit"}, individual: {uuid: "ind-1"}, encounterDateTime: at, voided: false, observations: weight(51), latestEntityApprovalStatus: {uuid: "eas-1a"}}],
    ["Encounter", {uuid: "enc-1b", encounterType: {uuid: "et-visit"}, individual: {uuid: "ind-1"}, encounterDateTime: at, voided: false, observations: weight(52)}],
    ["Encounter", {uuid: "enc-2a", encounterType: {uuid: "et-visit"}, individual: {uuid: "ind-2"}, encounterDateTime: at, voided: false, observations: weight(60)}],
    ["Encounter", {uuid: "enc-orphan", encounterType: {uuid: "et-visit"}, individual: {uuid: "ind-missing"}, voided: false, observations: []}],
    ["ProgramEnrolment", {uuid: "enl-1", program: {uuid: "pr-mother"}, individual: {uuid: "ind-1"}, enrolmentDateTime: at, voided: false, observations: []}],
    ["ProgramEnrolment", {uuid: "enl-2", program: {uuid: "pr-mother"}, individual: {uuid: "ind-2"}, enrolmentDateTime: at, voided: false, observations: []}],
    ["ProgramEncounter", {uuid: "pe-1a", encounterType: {uuid: "et-visit"}, programEnrolment: {uuid: "enl-1"}, voided: false, observations: []}],
    ["ProgramEncounter", {uuid: "pe-1b", encounterType: {uuid: "et-visit"}, programEnrolment: {uuid: "enl-1"}, voided: false, observations: []}],
    ["ProgramEncounter", {uuid: "pe-2a", encounterType: {uuid: "et-visit"}, programEnrolment: {uuid: "enl-2"}, voided: false, observations: []}],
    ["GroupSubject", {uuid: "gs-1", groupSubject: {uuid: "ind-hh"}, memberSubject: {uuid: "ind-1"}, groupRole: {uuid: "gr-member"}, membershipStartDate: at, voided: false}],
    ["IndividualRelationship", {uuid: "rel-1", relationship: {uuid: "rt-spouse"}, individualA: {uuid: "ind-1"}, individualB: {uuid: "ind-2"}, enterDateTime: at, voided: false}],
    ["ReportCard", {uuid: "rc-1", name: "Persons", colour: "#fff", voided: false, standardReportCardInputSubjectTypes: [{uuid: "st-person"}]}],
];

export function openSeededDb(extraSeed = []) {
    const rawDb = open({});
    const cfg = EntityMappingConfig.getInstance();
    const tableMetaMap = SchemaGenerator.generateAll(cfg);
    const realmSchemaMap = SchemaGenerator.buildRealmSchemaMap(cfg);
    rawDb.executeSync("PRAGMA foreign_keys = OFF");
    for (const sql of SchemaGenerator.generateCreateTableStatements(tableMetaMap)) rawDb.executeSync(sql);
    const proxy = new SqliteProxy(rawDb, cfg, tableMetaMap, realmSchemaMap);
    proxy.write(() => [...SEED, ...extraSeed].forEach(([schema, data]) => proxy.create(schema, data, true, {skipHydration: true})));
    proxy.ensureReferenceCacheBuilt();

    const execute = rawDb.executeSync.bind(rawDb);
    const selects = [];
    rawDb.executeSync = (sql, params) => {
        if (/^\s*SELECT/i.test(sql)) selects.push(sql);
        return execute(sql, params);
    };
    const rowsOf = (table) => execute(`SELECT * FROM ${table} ORDER BY rowid`).rows;
    return {rawDb, proxy, hydrator: proxy.hydrator, selects, rowsOf};
}

export const selectsFrom = (selects, table) => selects.filter(sql => new RegExp(`FROM ${table}\\b`).test(sql)).length;
