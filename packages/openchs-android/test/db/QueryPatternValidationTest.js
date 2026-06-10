import RealmQueryParser from '../../src/framework/db/RealmQueryParser';
import {EntityMappingConfig} from 'openchs-models';
import {SchemaGenerator} from '../../src/framework/db/SchemaGenerator';

const DUMMY_ARGS = ['arg0', 'arg1', 'arg2', 'arg3', 'arg4'];

// ── Queries that MUST translate to SQL ──
const SQL_TRANSLATABLE = [
    // Simple
    'uuid = $0',
    'uuid = null',
    'uuid <> $0',
    'voided = false',
    'voided=false',
    'voided = null or voided = false',
    'primaryDashboard = true',
    'secondaryDashboard = true',
    'dashboard.voided = false',
    'hasMigrated = false',
    'hasMigrated = false limit(1)',
    'name CONTAINS[c] $0',
    'name = $0',
    'parentUuid = $0',
    'typeUuid = $0',
    'allow = true',
    'hasAllPrivileges=true',
    'heroImage <> null',
    'read = false',
    'encounterDateTime = null',
    'encounterDateTime == null AND cancelDateTime == null',
    'encounterDateTime != null and cancelDateTime = null',
    'programExitDateTime!=null',
    'type = $0',
    'entity <> \'UserInfo\'',
    'entityName <> \'UserInfo\'',

    // Medium — AND/OR, parameterized, dot-notation
    'subjectType.uuid = $0',
    'lowestAddressLevel.uuid = $0 and subjectType.name = $1',
    'individual.subjectType.uuid = $0 and encounterType.uuid = $1',
    'individual.subjectType.uuid = $0 and program.uuid = $1',
    'programEnrolment.individual.subjectType.uuid = $0 and programEnrolment.program.uuid = $1 and encounterType.uuid = $2',
    'individual.uuid="abc"',
    'individual.uuid="abc" AND earliestVisitDateTime == null',
    'encounterType.name == $0 OR encounterType.uuid == $1',
    'individual.uuid == $0',
    'voided = false and individual.uuid = $0 and encounterDateTime == null AND cancelDateTime == null',
    'programEnrolment.uuid == $0',
    'voided = false and programEnrolment.individual.uuid = $0 and encounterDateTime == null AND cancelDateTime == null',
    'voided = false and programExitDateTime = null and individual.uuid = $0',
    'program.uuid == "abc"',
    'voided = false AND datatype = $0',
    'voided = false AND name CONTAINS[c] $0',
    'voided = false AND individual = null AND programEnrolment = null and used = false',
    'identifier = $0',
    'identifierSource.uuid = $0',
    'voided = false AND groupSubject.uuid = $0',
    'voided = false and groupSubjectType.uuid = $0',
    'groupSubject.uuid = $0 and memberSubject.subjectType.uuid = $1',
    'memberSubject.uuid = $0 and groupSubject.subjectType.uuid = $1 and groupRole.uuid = $2',
    'voided = false AND memberSubject.uuid = $0',
    'subjectType.name = $0',
    'subject.uuid = $0',
    'subject.uuid = $0 AND program.uuid = $1',
    'subject = $0',
    'voided = false AND (individualA.uuid="abc" OR individualB.uuid="abc")',
    'individualA.uuid = $0 or individualB.uuid = $0',
    'voided = false AND gender.uuid="abc"',
    'voided = false and relation.uuid = "abc"',
    'taskType.uuid = $0',
    'syncStatus = $0',
    'syncStatus = $0 AND syncSource <> $1',
    'entity = $0',
    'entityName = $0',
    'entityName = $0 and entityTypeUuid = $1',
    'voided = false and type=$0',
    'fileName == "test.jpg"',
    'commentThread.status = $0',
    'latestEntityApprovalStatus.approvalStatus.status = $0',
    'voided = false and parentUuid = null',
    'updatedOn <= $0',
    'subjectType = $0',
    'dashboard.uuid = $0 and voided = false',
    'voided = false and dashboardSection.dashboard.uuid = $0 and card.voided = false',
    'scheduledOn >= $0 && scheduledOn < $1',
    'completedOn >= $0 && completedOn < $1',
    'voided = false AND registrationDate <= $0',
    'programExitDateTime = null AND voided = false AND individual.voided = false',
    'uuid <> $0 and firstName = $1 and lastName = $2 and subjectType.uuid = $3 and middleName = $4',
    'privilege.name = $0 && privilege.entityType = $1 && allow = $2',
    'voided = false AND active = true',
    'enableApproval = true',
    'voided = false and level = 3',
    "taskType.type = 'Task' and completedOn = null",
    "individual.uuid = 'abc' and encounterType.uuid = 'def'",
    "voided = false and programExitDateTime = null and individual.uuid = 'abc' and program.uuid = 'def'",
    "subject.uuid = 'abc' AND program.uuid = 'def' and voided = false",
    "subjectTypeUuid = 'abc' AND programUuid <> null AND allow = true",
    "subjectTypeUuid = 'abc' AND encounterTypeUuid <> null AND allow = true",
    "privilege.name = 'Approve Subject' AND allow = true",
    "entityName = 'Individual'",
    "observationsTypeEntityUUID = 'abc' && form.formType = 'ProgramEncounter' && voided = false",
    "typeUuid = 'abc' AND voided = false",
    "parentUuid = 'abc' AND voided = false",
    "uuid = 'abc'",
    "voided = false and level = 2",
    // IN clause (Realm syntax used by server-defined rules)
    'uuid IN {"abc", "def", "ghi"}',
    'uuid IN {"single"}',
    'lowestAddressLevel.uuid IN {"a", "b", "c"}',
    "subjectType.name = 'Distribution' AND voided = false AND lowestAddressLevel.uuid IN {'uuid1', 'uuid2'}",
];

// ── Queries that should route to JS fallback (handled by JsFallbackFilterEvaluator) ──
const JS_FALLBACK = [
    'TRUEPREDICATE DISTINCT(entity)',
    'TRUEPREDICATE DISTINCT(entityName)',
    'TRUEPREDICATE DISTINCT(level)',
    'TRUEPREDICATE DISTINCT(typeUuid)',
    'TRUEPREDICATE DISTINCT(dashboard.uuid)',
    'TRUEPREDICATE DISTINCT(groupSubject.uuid)',
    'TRUEPREDICATE sort(createdDateTime asc) Distinct(commentThread.uuid)',
    '@links.@count == 0',
    '@links.@count > 0',
    'media.@size > 0',
    'ANY media.url CONTAINS[c] $0',
];

// ── Partial-parse queries: SQL handles some clauses, JS handles the rest ──
const PARTIAL_PARSE = [
    'voided = false and locationMappings.@count == 0',
];

// ── SUBQUERY on embedded lists (observations) → json_each SQL ──
const OBSERVATION_SUBQUERY_SQL = [
    'SUBQUERY(observations, $observation, $observation.concept.uuid = "abc").@count > 0',
    'SUBQUERY(observations, $obs, $obs.valueJSON contains "phoneNumber").@count > 0',
    'SUBQUERY(observations, $obs, $obs.concept.uuid = "c1" and $obs.valueJSON contains "test").@count > 0',
    'SUBQUERY(observations, $obs, $obs.concept.uuid = "c1").@count = 0',
    'SUBQUERY(observations, $obs, $obs.concept.uuid = "c1" and ($obs.valueJSON contains "42" OR $obs.valueJSON contains "43")).@count > 0',
];

// ── Queries through embedded list properties that resolve to the parent JSON column ──
const EMBEDDED_JSON_SEARCH = [
    'observations.valueJSON contains[c] "keyword"',
    '(observations.concept.keyValues.key = "PrimaryContact" or observations.concept.keyValues.key = "ContactNumber") and (observations.valueJSON CONTAINS "1234")',
];

describe('Query pattern validation against RealmQueryParser', () => {
    let realmSchemaMap;

    beforeAll(() => {
        const entityMappingConfig = EntityMappingConfig.getInstance();
        realmSchemaMap = SchemaGenerator.buildRealmSchemaMap(entityMappingConfig);
    });

    describe('SQL-translatable queries', () => {
        test.each(SQL_TRANSLATABLE)('%s', (query) => {
            const result = RealmQueryParser.parse(query, DUMMY_ARGS);
            expect(result.unsupported).toBe(false);
            expect(result.where).toBeTruthy();
            expect(result.partialParse).toBeFalsy();
        });
    });

    describe('JS-fallback queries (full)', () => {
        test.each(JS_FALLBACK)('%s', (query) => {
            const result = RealmQueryParser.parse(query, DUMMY_ARGS);
            // Should either be fully unsupported or partially parsed
            expect(result.unsupported === true || result.partialParse === true).toBe(true);
        });
    });

    describe('Partial-parse queries (SQL + JS)', () => {
        test.each(PARTIAL_PARSE)('%s', (query) => {
            const result = RealmQueryParser.parse(query, DUMMY_ARGS);
            // These should ideally be partially parsed (SQL for supported clauses)
            if (result.partialParse) {
                expect(result.where).toBeTruthy();
                expect(result.skippedClauses.length).toBeGreaterThan(0);
            } else {
                // Full fallback is also acceptable
                expect(result.unsupported).toBe(true);
            }
        });
    });

    describe('Observation SUBQUERY → json_each SQL', () => {
        test.each(OBSERVATION_SUBQUERY_SQL)('%s', (query) => {
            const result = RealmQueryParser.parse(query, DUMMY_ARGS, 'Individual', realmSchemaMap, 0);
            expect(result.unsupported).toBe(false);
            expect(result.where).toBeTruthy();
            expect(result.where).toContain('json_each');
            expect(result.partialParse).toBeFalsy();
        });
    });

    describe('Embedded JSON column queries (observations.valueJSON → parent JSON column)', () => {
        test.each(EMBEDDED_JSON_SEARCH)('%s', (query) => {
            const result = RealmQueryParser.parse(query, DUMMY_ARGS);
            // Parser recognizes embedded list properties and resolves to the parent's JSON column,
            // enabling SQL-level search within JSON text instead of JS fallback.
            expect(result.unsupported).toBe(false);
            expect(result.where).toBeTruthy();
        });
    });

    it('summary', () => {
        let sqlOk = 0, jsFallback = 0, partial = 0, errors = 0;
        const allQueries = [...SQL_TRANSLATABLE, ...OBSERVATION_SUBQUERY_SQL, ...JS_FALLBACK, ...PARTIAL_PARSE, ...EMBEDDED_JSON_SEARCH];
        const failedQueries = [];

        for (const q of SQL_TRANSLATABLE) {
            const r = RealmQueryParser.parse(q, DUMMY_ARGS);
            if (!r.unsupported && !r.partialParse) sqlOk++;
            else {
                errors++;
                failedQueries.push({query: q, reason: r.reason || 'unexpected fallback'});
            }
        }
        for (const q of OBSERVATION_SUBQUERY_SQL) {
            const r = RealmQueryParser.parse(q, DUMMY_ARGS, 'Individual', realmSchemaMap, 0);
            if (!r.unsupported && !r.partialParse && r.where && r.where.includes('json_each')) sqlOk++;
            else {
                errors++;
                failedQueries.push({query: q, reason: 'expected json_each SQL but got: ' + (r.reason || r.where || 'unknown')});
            }
        }
        for (const q of JS_FALLBACK) {
            const r = RealmQueryParser.parse(q, DUMMY_ARGS);
            if (r.unsupported || r.partialParse) jsFallback++;
            else {
                errors++;
                failedQueries.push({query: q, reason: 'expected fallback but got SQL'});
            }
        }
        for (const q of PARTIAL_PARSE) {
            const r = RealmQueryParser.parse(q, DUMMY_ARGS);
            if (r.partialParse || r.unsupported) partial++;
            else {
                errors++;
                failedQueries.push({query: q, reason: 'expected partial/fallback but got SQL'});
            }
        }
        // Runtime fallback queries are counted as SQL (parser accepts them)
        for (const q of EMBEDDED_JSON_SEARCH) {
            const r = RealmQueryParser.parse(q, DUMMY_ARGS);
            if (!r.unsupported) sqlOk++;
            else {
                errors++;
                failedQueries.push({query: q, reason: 'expected SQL parse but got fallback'});
            }
        }

        console.log('\n=== QUERY VALIDATION SUMMARY ===');
        console.log(`SQL translated:    ${sqlOk}/${SQL_TRANSLATABLE.length + OBSERVATION_SUBQUERY_SQL.length}`);
        console.log(`JS fallback:       ${jsFallback}/${JS_FALLBACK.length}`);
        console.log(`Partial (SQL+JS):  ${partial}/${PARTIAL_PARSE.length}`);
        console.log(`Total validated:   ${allQueries.length}`);
        console.log(`Errors:            ${errors}`);
        if (failedQueries.length > 0) {
            console.log('\nFailed:');
            failedQueries.forEach(f => console.log(`  ${f.query}  →  ${f.reason}`));
        }

        expect(errors).toBe(0);
    });
});
