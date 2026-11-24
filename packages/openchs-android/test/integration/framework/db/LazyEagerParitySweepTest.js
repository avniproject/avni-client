// Lazy vs eager over every row of every table; LAZY_PARITY_DB=<path> sweeps a device snapshot.
import {EntityMappingConfig} from "openchs-models";
import SchemaGenerator from "../../../../src/framework/db/SchemaGenerator";
import SqliteProxy from "../../../../src/framework/db/SqliteProxy";
import {openSeededDb} from "./lazyFixture";

const Database = require("better-sqlite3");
const SNAPSHOT_DEPTH = 3;
const MIN_SEEDED_ROWS = 30;
const MIN_SEEDED_TABLES = 30;
const at = new Date("2026-09-01T10:00:00.000Z");
const obs = (uuid, answer) => [{concept: {uuid}, valueJSON: JSON.stringify({answer})}];

const EXTRA_SEED = [
    ["AddressLevel", {uuid: "al-1", name: "Village", level: 1, type: "Village", titleLineage: "Village", voided: false, locationMappings: []}],
    ["AddressLevel", {uuid: "al-2", name: "Block", level: 2, type: "Block", titleLineage: "Block", voided: false, locationMappings: [], locationProperties: obs("c-weight", 1)}],
    ["LocationMapping", {uuid: "lm-1", parent: {uuid: "al-2"}, child: {uuid: "al-1"}, voided: false}],
    ["LocationHierarchy", {uuid: "lh-1", name: "Village", type: "Village", level: 1, titleLineage: "Village", voided: false}],
    ["Individual", {uuid: "ind-3", firstName: "Chitra", subjectType: {uuid: "st-person"}, lowestAddressLevel: {uuid: "al-1"}, registrationDate: at, voided: false, observations: obs("c-weight", 40)}],
    ["Concept", {uuid: "c-coded", name: "Colour", datatype: "Coded", voided: false}],
    ["Concept", {uuid: "c-red", name: "Red", datatype: "NA", voided: false}],
    ["Concept", {uuid: "c-blue", name: "Blue", datatype: "NA", voided: false}],
    ["ConceptAnswer", {uuid: "ca-red", concept: {uuid: "c-red"}, answerOrder: 1, abnormal: false, unique: false, voided: false}],
    ["ConceptAnswer", {uuid: "ca-blue", concept: {uuid: "c-blue"}, answerOrder: 2, abnormal: true, unique: false, voided: false}],
    ["Concept", {uuid: "c-coded2", name: "Shade", datatype: "Coded", voided: false, answers: [{uuid: "ca-red"}, {uuid: "ca-blue"}]}],
    ["Documentation", {uuid: "doc-1", name: "Help", voided: false}],
    ["DocumentationItem", {uuid: "di-1", content: "text", language: "en", documentation: {uuid: "doc-1"}, voided: false}],
    ["Form", {uuid: "f-1", formType: "IndividualProfile", name: "Registration"}],
    ["FormElementGroup", {uuid: "feg-1", name: "Basics", displayOrder: 1, form: {uuid: "f-1"}, voided: false, timed: false}],
    ["FormElement", {uuid: "fe-1", name: "Weight", displayOrder: 1, mandatory: true, concept: {uuid: "c-weight"}, formElementGroup: {uuid: "feg-1"}, voided: false, documentation: {uuid: "doc-1"}}],
    ["FormElement", {uuid: "fe-2", name: "Colour", displayOrder: 2, mandatory: false, concept: {uuid: "c-coded2"}, formElementGroup: {uuid: "feg-1"}, voided: false}],
    ["FormMapping", {uuid: "fm-1", form: {uuid: "f-1"}, subjectType: {uuid: "st-person"}, voided: false, enableApproval: false}],
    ["ChecklistDetail", {uuid: "cd-1", name: "Vaccines", voided: false}],
    ["ChecklistItemDetail", {uuid: "cid-1", concept: {uuid: "c-weight"}, checklistDetail: {uuid: "cd-1"}, voided: false, scheduleOnExpiryOfDependency: false}],
    ["ChecklistItemDetail", {uuid: "cid-2", concept: {uuid: "c-weight"}, checklistDetail: {uuid: "cd-1"}, dependentOn: {uuid: "cid-1"}, voided: false, scheduleOnExpiryOfDependency: true}],
    ["Checklist", {uuid: "cl-1", detail: {uuid: "cd-1"}, baseDate: at, programEnrolment: {uuid: "enl-1"}}],
    ["ChecklistItem", {uuid: "cli-1", detail: {uuid: "cid-1"}, checklist: {uuid: "cl-1"}, observations: []}],
    ["ChecklistItem", {uuid: "cli-2", detail: {uuid: "cid-2"}, checklist: {uuid: "cl-1"}, observations: obs("c-weight", 3)}],
    ["CommentThread", {uuid: "ct-1", status: "Open", openDateTime: at, voided: false}],
    ["Comment", {uuid: "cm-1", text: "hello", subject: {uuid: "ind-1"}, displayUsername: "u", createdByUsername: "u", createdDateTime: at, lastModifiedDateTime: at, commentThread: {uuid: "ct-1"}, voided: false}],
    ["Comment", {uuid: "cm-2", text: "again", subject: {uuid: "ind-1"}, displayUsername: "u", createdByUsername: "u", createdDateTime: at, lastModifiedDateTime: at, commentThread: {uuid: "ct-1"}, voided: false}],
    ["DraftSubject", {uuid: "ds-1", subjectType: {uuid: "st-person"}, firstName: "Draft", registrationDate: at, lowestAddressLevel: {uuid: "al-1"}, observations: [], updatedOn: at}],
    ["DraftEncounter", {uuid: "de-1", encounterType: {uuid: "et-visit"}, individual: {uuid: "ind-1"}, observations: [], cancelObservations: [], voided: false, updatedOn: at}],
    ["DraftEnrolment", {uuid: "den-1", program: {uuid: "pr-mother"}, enrolmentDateTime: at, individual: {uuid: "ind-1"}, observations: [], programExitObservations: [], voided: false, updatedOn: at}],
    ["DraftProgramEncounter", {uuid: "dpe-1", encounterType: {uuid: "et-visit"}, programEnrolment: {uuid: "enl-1"}, observations: [], cancelObservations: [], voided: false, updatedOn: at}],
    ["TaskType", {uuid: "tt-1", name: "Call", type: "Call", voided: false, metadataSearchFields: [{uuid: "c-weight"}]}],
    ["TaskStatus", {uuid: "ts-1", name: "Open", isTerminal: false, taskType: {uuid: "tt-1"}, voided: false}],
    ["Task", {uuid: "tk-1", name: "Call Asha", taskType: {uuid: "tt-1"}, taskStatus: {uuid: "ts-1"}, scheduledOn: at, subject: {uuid: "ind-1"}, metadata: obs("c-weight", 1), observations: [], voided: false}],
    ["IndividualRelation", {uuid: "ir-1", name: "Mother", voided: false}],
    ["IndividualRelationGenderMapping", {uuid: "irg-1", relation: {uuid: "ir-1"}, gender: {uuid: "g-f"}, voided: false}],
    ["SubjectProgramEligibility", {uuid: "spe-1", subject: {uuid: "ind-1"}, program: {uuid: "pr-mother"}, checkDate: at, eligible: true, observations: [], voided: false}],
    ["IdentifierSource", {uuid: "is-1", name: "IDs"}],
    ["IdentifierAssignment", {uuid: "ia-1", identifierSource: {uuid: "is-1"}, identifier: "A1", assignmentOrder: 1, individual: {uuid: "ind-1"}, used: true, voided: false}],
    ["News", {uuid: "n-1", title: "News", publishedDate: at, voided: false, read: false, lastModifiedDateTime: at}],
    ["Dashboard", {uuid: "db-1", name: "Main", voided: false}],
    ["DashboardFilter", {uuid: "dbf-1", dashboard: {uuid: "db-1"}, name: "F", filterConfig: "{}", voided: false}],
    ["DashboardSection", {uuid: "dbs-1", dashboard: {uuid: "db-1"}, name: "S", viewType: "Tile", displayOrder: 1, voided: false}],
    ["DashboardSectionCardMapping", {uuid: "dscm-1", dashboardSection: {uuid: "dbs-1"}, card: {uuid: "rc-1"}, displayOrder: 1, voided: false}],
    ["Groups", {uuid: "grp-1", name: "Everyone", hasAllPrivileges: false}],
    ["GroupDashboard", {uuid: "gd-1", primaryDashboard: true, secondaryDashboard: false, group: {uuid: "grp-1"}, dashboard: {uuid: "db-1"}, voided: false}],
    ["Privilege", {uuid: "pv-1", name: "View", description: "d", entityType: "Subject"}],
    ["GroupPrivileges", {uuid: "gp-1", group: {uuid: "grp-1"}, privilege: {uuid: "pv-1"}, subjectTypeUuid: "st-person", allow: true}],
    ["RuleDependency", {uuid: "rd-1", code: "x"}],
    ["Rule", {uuid: "ru-1", _entityString: "{}", type: "t", name: "r", fnName: "f", executionOrder: 1, voided: false}],
    ["Video", {uuid: "v-1", title: "Clip", filePath: "a.mp4", voided: false}],
    ["VideoTelemetric", {uuid: "vt-1", video: {uuid: "v-1"}, playerOpenTime: at, playerCloseTime: at, videoStartTime: 0, videoEndTime: 1}],
    ["StandardReportCardType", {uuid: "srct-1", name: "T", type: "Total", voided: false}],
    ["CustomCardConfig", {uuid: "ccc-1", name: "C", htmlFileS3Key: "k", voided: false}],
    ["Translation", {uuid: "tr-1", language: "en", translations: "{}"}],
    ["LocaleMapping", {uuid: "lc-1", locale: "en", displayText: "English"}],
    ["MenuItem", {uuid: "mi-1", displayKey: "k", type: "t", group: "g", voided: false}],
    ["Calendar", {uuid: "cal-1", name: "C", workingPattern: "x", isDefault: true, voided: false}],
    ["CalendarDateMarker", {uuid: "cdm-1", calendarUUID: "cal-1", markerDate: "2026-09-01", name: "H", isWorking: false, voided: false}],
    ["AttendanceType", {uuid: "at-1", subjectTypeUUID: "st-person", name: "Daily", sortOrder: 1, config: "{}", voided: false}],
    ["Session", {uuid: "se-1", groupSubjectUUID: "ind-hh", scheduledDate: "2026-09-01", attendanceTypeUUID: "at-1", status: "Open", voided: false}],
    ["AttendanceRecord", {uuid: "ar-1", sessionUUID: "se-1", subjectUUID: "ind-1", status: "Present", reasonConceptUUIDs: ["c-red", "c-blue"], needsFollowUp: false, voided: false}],
];

function openSnapshot(path) {
    const db = new Database(path, {readonly: true, fileMustExist: true});
    const rawDb = {
        executeSync: (sql, params = []) => ({rows: /^\s*(SELECT|PRAGMA)/i.test(sql) ? db.prepare(sql).all(...params) : []}),
        close: () => db.close(),
    };
    const cfg = EntityMappingConfig.getInstance();
    const proxy = new SqliteProxy(rawDb, cfg, SchemaGenerator.generateAll(cfg), SchemaGenerator.buildRealmSchemaMap(cfg));
    proxy.ensureReferenceCacheBuilt();
    return {rawDb, proxy, hydrator: proxy.hydrator};
}

function snapshot(value, depth) {
    if (value === undefined || value === null) return null;
    if (value instanceof Date) return {$date: value.getTime()};
    if (Array.isArray(value)) return value.map(item => snapshot(item, depth));
    if (typeof value === "object") {
        if (depth === 0) return {$uuid: value.uuid === undefined ? "?" : value.uuid};
        const out = {};
        Object.keys(value).sort().forEach(key => out[key] = snapshot(value[key], depth - 1));
        return out;
    }
    return value;
}

function rowsOf(proxy, schemaName, maxRows) {
    const results = proxy.objects(schemaName);
    const limited = maxRows ? results.filtered(`limit(${maxRows})`) : results;
    return Array.from(limited).map(entity => snapshot(entity.that, SNAPSHOT_DEPTH));
}

describe("lazy against eager, every row of every table", () => {
    const fromSnapshot = !!process.env.LAZY_PARITY_DB;
    const maxRows = Number(process.env.LAZY_PARITY_MAX_ROWS || 0);
    let db;

    beforeAll(() => {
        db = fromSnapshot ? openSnapshot(process.env.LAZY_PARITY_DB) : openSeededDb(EXTRA_SEED);
        db.hydrator.ensureConceptCache();
    });

    afterAll(() => db.rawDb.close());

    it("reads identically on both paths", () => {
        const mismatches = [];
        let rowsCompared = 0;
        let nonEmptyTables = 0;
        Array.from(db.proxy.tableMetaMap.keys()).sort().forEach(schemaName => {
            db.hydrator.eagerReferenceMode = true;
            const eager = rowsOf(db.proxy, schemaName, maxRows);
            db.hydrator.eagerReferenceMode = false;
            const lazy = rowsOf(db.proxy, schemaName, maxRows);
            rowsCompared += eager.length;
            if (eager.length > 0) nonEmptyTables++;
            if (JSON.stringify(lazy) !== JSON.stringify(eager)) {
                const index = lazy.findIndex((row, i) => JSON.stringify(row) !== JSON.stringify(eager[i]));
                mismatches.push({schemaName, rows: [eager.length, lazy.length], firstDifferentRow: index, eager: eager[index], lazy: lazy[index]});
            }
        });
        console.log(`LazyEagerParitySweep: compared ${rowsCompared} rows across ${db.proxy.tableMetaMap.size} tables, ${nonEmptyTables} non-empty`);
        expect(mismatches).toEqual([]);
        if (!fromSnapshot) {
            expect(rowsCompared).toBeGreaterThanOrEqual(MIN_SEEDED_ROWS);
            expect(nonEmptyTables).toBeGreaterThanOrEqual(MIN_SEEDED_TABLES);
        }
    }, fromSnapshot ? 60 * 60 * 1000 : 30 * 1000);
});
