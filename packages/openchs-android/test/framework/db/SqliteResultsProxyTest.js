import {SqliteResultsProxy} from "../../../src/framework/db/SqliteResultsProxy";

// ──── Mock entity class ────

class MockEntity {
    constructor(obj) {
        Object.assign(this, obj);
    }
}

// ──── Mock hydrator (identity: returns row with camelCase keys) ────

function createMockHydrator(transform) {
    return {
        beginHydrationSession: jest.fn(),
        endHydrationSession: jest.fn(),
        hydrate: jest.fn((schemaName, row, opts) => {
            return transform ? transform(row) : {...row};
        }),
    };
}

// ──── Schema map for JOIN tests ────

const schemaMap = new Map();
schemaMap.set("Individual", {
    name: "Individual",
    primaryKey: "uuid",
    properties: {
        uuid: "string",
        firstName: "string",
        lastName: "string",
        voided: {type: "bool", default: false},
        dateOfBirth: "date",
        registrationDate: "date",
        subjectType: {type: "object", objectType: "SubjectType"},
        gender: {type: "object", objectType: "Gender"},
        lowestAddressLevel: {type: "object", objectType: "AddressLevel"},
    },
});
schemaMap.set("SubjectType", {
    name: "SubjectType",
    primaryKey: "uuid",
    properties: {uuid: "string", name: "string", type: "string"},
});
schemaMap.set("Gender", {
    name: "Gender",
    primaryKey: "uuid",
    properties: {uuid: "string", name: "string"},
});
schemaMap.set("AddressLevel", {
    name: "AddressLevel",
    primaryKey: "uuid",
    properties: {uuid: "string", name: "string", level: "double", typeUuid: "string"},
});
schemaMap.set("Encounter", {
    name: "Encounter",
    primaryKey: "uuid",
    properties: {
        uuid: "string",
        encounterDateTime: "date",
        voided: {type: "bool", default: false},
        individual: {type: "object", objectType: "Individual"},
        encounterType: {type: "object", objectType: "EncounterType"},
    },
});
schemaMap.set("EncounterType", {
    name: "EncounterType",
    primaryKey: "uuid",
    properties: {uuid: "string", name: "string"},
});

// ──── Helper to create a proxy and capture SQL ────

function createProxy({rows = [], schemaName = "Individual", tableName = "individual", realmSchemaMap = schemaMap, hydratorTransform} = {}) {
    const executeQuery = jest.fn(() => rows);
    const hydrator = createMockHydrator(hydratorTransform || (row => ({...row})));

    const proxy = SqliteResultsProxy.create({
        schemaName,
        tableName,
        entityClass: MockEntity,
        executeQuery,
        hydrator,
        realmSchemaMap,
    });

    return {proxy, executeQuery, hydrator};
}

function getExecutedSql(executeQuery) {
    return executeQuery.mock.calls[0]?.[0];
}

function getExecutedParams(executeQuery) {
    return executeQuery.mock.calls[0]?.[1];
}

// ──── Tests ────

describe("SqliteResultsProxy — supported query types", () => {

    // ──── Simple comparisons ────

    describe("simple comparisons", () => {
        it("should generate equality WHERE clause", () => {
            const {proxy, executeQuery} = createProxy();
            const filtered = proxy.filtered('uuid = "abc-123"');
            filtered.length; // trigger execution
            expect(getExecutedSql(executeQuery)).toContain('t0."uuid" = ?');
            expect(getExecutedParams(executeQuery)).toEqual(["abc-123"]);
        });

        it("should generate boolean false comparison", () => {
            const {proxy, executeQuery} = createProxy();
            const filtered = proxy.filtered("voided = false");
            filtered.length;
            expect(getExecutedSql(executeQuery)).toContain('t0."voided" = ?');
            expect(getExecutedParams(executeQuery)).toEqual([0]);
        });

        it("should generate boolean true comparison", () => {
            const {proxy, executeQuery} = createProxy();
            const filtered = proxy.filtered("voided = true");
            filtered.length;
            expect(getExecutedParams(executeQuery)).toEqual([1]);
        });

        it("should generate IS NULL for null comparison", () => {
            const {proxy, executeQuery} = createProxy();
            const filtered = proxy.filtered("encounterDateTime = null");
            filtered.length;
            expect(getExecutedSql(executeQuery)).toContain('t0."encounter_date_time" IS NULL');
            expect(getExecutedParams(executeQuery)).toEqual([]);
        });

        it("should generate IS NOT NULL for != null", () => {
            const {proxy, executeQuery} = createProxy();
            const filtered = proxy.filtered("encounterDateTime != null");
            filtered.length;
            expect(getExecutedSql(executeQuery)).toContain('t0."encounter_date_time" IS NOT NULL');
        });

        it("should generate inequality operators", () => {
            const {proxy, executeQuery} = createProxy({schemaName: "AddressLevel", tableName: "address_level"});
            const filtered = proxy.filtered("level > 2");
            filtered.length;
            expect(getExecutedSql(executeQuery)).toContain('t0."level" > ?');
            expect(getExecutedParams(executeQuery)).toEqual([2]);
        });

        it("should handle <> as !=", () => {
            const {proxy, executeQuery} = createProxy({schemaName: "AddressLevel", tableName: "address_level"});
            const filtered = proxy.filtered("level <> 0");
            filtered.length;
            expect(getExecutedSql(executeQuery)).toContain('t0."level" != ?');
        });

        it("should generate <= and >= operators", () => {
            const {proxy, executeQuery} = createProxy({schemaName: "AddressLevel", tableName: "address_level"});
            proxy.filtered("level >= 1").length;
            expect(getExecutedSql(executeQuery)).toContain('t0."level" >= ?');
            expect(getExecutedParams(executeQuery)).toEqual([1]);
        });
    });

    // ──── Parameter substitution ────

    describe("parameter substitution ($0, $1, ...)", () => {
        it("should substitute $0", () => {
            const {proxy, executeQuery} = createProxy();
            proxy.filtered("uuid = $0", "my-uuid").length;
            expect(getExecutedSql(executeQuery)).toContain('t0."uuid" = ?');
            expect(getExecutedParams(executeQuery)).toEqual(["my-uuid"]);
        });

        it("should substitute multiple parameters", () => {
            const {proxy, executeQuery} = createProxy();
            proxy.filtered("firstName = $0 AND lastName = $1", "John", "Doe").length;
            expect(getExecutedParams(executeQuery)).toEqual(["John", "Doe"]);
        });

        it("should convert Date parameter to epoch ms", () => {
            const date = new Date(2024, 0, 15);
            const {proxy, executeQuery} = createProxy();
            proxy.filtered("registrationDate > $0", date).length;
            expect(getExecutedParams(executeQuery)).toEqual([date.getTime()]);
        });
    });

    // ──── Logical operators ────

    describe("logical operators (AND, OR, NOT)", () => {
        it("should generate AND", () => {
            const {proxy, executeQuery} = createProxy();
            proxy.filtered("voided = false AND firstName = $0", "Alice").length;
            const sql = getExecutedSql(executeQuery);
            expect(sql).toContain("AND");
            expect(getExecutedParams(executeQuery)).toEqual([0, "Alice"]);
        });

        it("should generate OR", () => {
            const {proxy, executeQuery} = createProxy();
            proxy.filtered('firstName = "Alice" OR firstName = "Bob"').length;
            const sql = getExecutedSql(executeQuery);
            expect(sql).toContain("OR");
            expect(getExecutedParams(executeQuery)).toEqual(["Alice", "Bob"]);
        });

        it("should generate NOT", () => {
            const {proxy, executeQuery} = createProxy();
            proxy.filtered("NOT voided = true").length;
            expect(getExecutedSql(executeQuery)).toContain("NOT");
            expect(getExecutedParams(executeQuery)).toEqual([1]);
        });

        it("should handle parenthesized grouping", () => {
            const {proxy, executeQuery} = createProxy();
            proxy.filtered('(firstName = "Alice" OR firstName = "Bob") AND voided = false').length;
            const sql = getExecutedSql(executeQuery);
            expect(sql).toContain("OR");
            expect(sql).toContain("AND");
            expect(getExecutedParams(executeQuery)).toEqual(["Alice", "Bob", 0]);
        });
    });

    // ──── String operators ────

    describe("string operators (CONTAINS, BEGINSWITH, ENDSWITH)", () => {
        it("should generate LIKE for CONTAINS", () => {
            const {proxy, executeQuery} = createProxy();
            proxy.filtered('firstName CONTAINS "ali"').length;
            expect(getExecutedSql(executeQuery)).toContain("LIKE ?");
            expect(getExecutedParams(executeQuery)).toEqual(["%ali%"]);
        });

        it("should generate LIKE for BEGINSWITH", () => {
            const {proxy, executeQuery} = createProxy();
            proxy.filtered('firstName BEGINSWITH "Al"').length;
            expect(getExecutedParams(executeQuery)).toEqual(["Al%"]);
        });

        it("should generate LIKE for ENDSWITH", () => {
            const {proxy, executeQuery} = createProxy();
            proxy.filtered('firstName ENDSWITH "ce"').length;
            expect(getExecutedParams(executeQuery)).toEqual(["%ce"]);
        });

        it("should generate LOWER() for case-insensitive CONTAINS[c]", () => {
            const {proxy, executeQuery} = createProxy();
            proxy.filtered('firstName CONTAINS[c] "ALICE"').length;
            const sql = getExecutedSql(executeQuery);
            expect(sql).toContain("LOWER(");
            expect(getExecutedParams(executeQuery)).toEqual(["%alice%"]);
        });

        it("should generate LIKE with escaped wildcards for LIKE operator", () => {
            const {proxy, executeQuery} = createProxy();
            proxy.filtered('firstName LIKE "*test*"').length;
            expect(getExecutedParams(executeQuery)).toEqual(["%test%"]);
        });
    });

    // ──── Dot-notation JOINs ────

    describe("dot-notation (JOINs)", () => {
        it("should generate LEFT JOIN for single dot-path", () => {
            const {proxy, executeQuery} = createProxy();
            proxy.filtered("subjectType.uuid = $0", "st-uuid").length;
            const sql = getExecutedSql(executeQuery);
            expect(sql).toContain("LEFT JOIN subject_type AS t1");
            expect(sql).toContain('t0."subject_type_uuid" = t1."uuid"');
            expect(sql).toContain('t1."uuid" = ?');
            expect(getExecutedParams(executeQuery)).toEqual(["st-uuid"]);
        });

        it("should generate chained JOINs for multi-level dot-path", () => {
            const {proxy, executeQuery} = createProxy({schemaName: "Encounter", tableName: "encounter"});
            proxy.filtered("individual.subjectType.uuid = $0", "st-uuid").length;
            const sql = getExecutedSql(executeQuery);
            expect(sql).toContain("LEFT JOIN individual AS t1");
            expect(sql).toContain("LEFT JOIN subject_type AS t2");
            expect(sql).toContain('t2."uuid" = ?');
        });

        it("should use DISTINCT when JOINs are present", () => {
            const {proxy, executeQuery} = createProxy();
            proxy.filtered("subjectType.uuid = $0", "st-uuid").length;
            const sql = getExecutedSql(executeQuery);
            expect(sql).toContain("SELECT DISTINCT t0.*");
        });

        it("should NOT use DISTINCT when no JOINs", () => {
            const {proxy, executeQuery} = createProxy();
            proxy.filtered("voided = false").length;
            const sql = getExecutedSql(executeQuery);
            expect(sql).toMatch(/^SELECT t0\.\*/);
            expect(sql).not.toContain("DISTINCT");
        });
    });

    // ──── Chained .filtered() ────

    describe("chained .filtered() calls", () => {
        it("should accumulate WHERE clauses with AND", () => {
            const {proxy, executeQuery} = createProxy();
            proxy.filtered("voided = false").filtered("firstName = $0", "Alice").length;
            const sql = getExecutedSql(executeQuery);
            expect(sql).toContain('t0."voided" = ?');
            expect(sql).toContain('t0."first_name" = ?');
            expect(sql).toContain("AND");
            expect(getExecutedParams(executeQuery)).toEqual([0, "Alice"]);
        });

        it("should accumulate JOINs across chained calls without alias collision", () => {
            const {proxy, executeQuery} = createProxy();
            proxy
                .filtered("subjectType.uuid = $0", "st-uuid")
                .filtered("gender.uuid = $0", "g-uuid")
                .length;
            const sql = getExecutedSql(executeQuery);
            expect(sql).toContain("LEFT JOIN subject_type AS t1");
            expect(sql).toContain("LEFT JOIN gender AS t2");
            expect(getExecutedParams(executeQuery)).toEqual(["st-uuid", "g-uuid"]);
        });

        it("should chain three .filtered() calls", () => {
            const {proxy, executeQuery} = createProxy();
            proxy
                .filtered("voided = false")
                .filtered("firstName = $0", "Alice")
                .filtered("lastName = $0", "Smith")
                .length;
            expect(getExecutedParams(executeQuery)).toEqual([0, "Alice", "Smith"]);
        });
    });

    // ──── .sorted() ────

    describe("sorted()", () => {
        it("should generate ORDER BY ASC for string descriptor", () => {
            const {proxy, executeQuery} = createProxy();
            proxy.sorted("firstName").length;
            const sql = getExecutedSql(executeQuery);
            expect(sql).toContain('ORDER BY t0."first_name" ASC');
        });

        it("should generate ORDER BY DESC with reverse=true", () => {
            const {proxy, executeQuery} = createProxy();
            proxy.sorted("firstName", true).length;
            const sql = getExecutedSql(executeQuery);
            expect(sql).toContain('ORDER BY t0."first_name" DESC');
        });

        it("should generate multi-column ORDER BY for array descriptor", () => {
            const {proxy, executeQuery} = createProxy();
            proxy.sorted([["firstName", false], ["lastName", true]]).length;
            const sql = getExecutedSql(executeQuery);
            expect(sql).toContain('t0."first_name" ASC');
            expect(sql).toContain('t0."last_name" DESC');
        });

        it("should generate JOIN for dot-notation sort field", () => {
            const {proxy, executeQuery} = createProxy();
            proxy.sorted("subjectType.name").length;
            const sql = getExecutedSql(executeQuery);
            expect(sql).toContain("LEFT JOIN subject_type AS t1");
            expect(sql).toContain('t1."name" ASC');
        });

        it("should combine filtered() and sorted()", () => {
            const {proxy, executeQuery} = createProxy();
            proxy.filtered("voided = false").sorted("firstName").length;
            const sql = getExecutedSql(executeQuery);
            expect(sql).toContain("WHERE");
            expect(sql).toContain("ORDER BY");
        });

        it("should preserve sort across chained filtered() calls", () => {
            const {proxy, executeQuery} = createProxy();
            proxy.filtered("voided = false").sorted("firstName").filtered("lastName = $0", "Doe").length;
            const sql = getExecutedSql(executeQuery);
            expect(sql).toContain("ORDER BY");
            expect(getExecutedParams(executeQuery)).toEqual([0, "Doe"]);
        });
    });

    // ──── Aggregate functions ────

    describe("aggregate functions", () => {
        it("max() should generate MAX SQL", () => {
            const {proxy, executeQuery} = createProxy({
                rows: [{max_val: 100}],
                schemaName: "AddressLevel",
                tableName: "address_level",
            });
            // Need to override executeQuery to return the aggregate row
            executeQuery.mockReturnValue([{max_val: 100}]);
            const result = proxy.filtered("voided = false").max("level");
            const sql = getExecutedSql(executeQuery);
            expect(sql).toContain('MAX(t0."level")');
            expect(result).toBe(100);
        });

        it("min() should generate MIN SQL", () => {
            const {proxy, executeQuery} = createProxy({
                schemaName: "AddressLevel",
                tableName: "address_level",
            });
            executeQuery.mockReturnValue([{min_val: 1}]);
            const result = proxy.filtered("voided = false").min("level");
            expect(getExecutedSql(executeQuery)).toContain('MIN(t0."level")');
            expect(result).toBe(1);
        });

        it("sum() should generate SUM SQL", () => {
            const {proxy, executeQuery} = createProxy({
                schemaName: "AddressLevel",
                tableName: "address_level",
            });
            executeQuery.mockReturnValue([{sum_val: 42}]);
            const result = proxy.filtered("voided = false").sum("level");
            expect(getExecutedSql(executeQuery)).toContain('SUM(t0."level")');
            expect(result).toBe(42);
        });

        it("sum() should return 0 for null result", () => {
            const {proxy, executeQuery} = createProxy({
                schemaName: "AddressLevel",
                tableName: "address_level",
            });
            executeQuery.mockReturnValue([{sum_val: null}]);
            expect(proxy.sum("level")).toBe(0);
        });

        it("max() should return undefined for empty result", () => {
            const {proxy, executeQuery} = createProxy({
                schemaName: "AddressLevel",
                tableName: "address_level",
            });
            executeQuery.mockReturnValue([]);
            expect(proxy.max("level")).toBeUndefined();
        });
    });

    // ──── Collection API ────

    describe("collection API", () => {
        function createPopulatedProxy() {
            const rows = [
                {uuid: "1", first_name: "Alice", voided: 0},
                {uuid: "2", first_name: "Bob", voided: 0},
                {uuid: "3", first_name: "Charlie", voided: 0},
            ];
            return createProxy({
                rows,
                hydratorTransform: row => ({
                    uuid: row.uuid,
                    firstName: row.first_name,
                    voided: row.voided === 1,
                }),
            });
        }

        it("length should return row count", () => {
            const {proxy} = createPopulatedProxy();
            expect(proxy.length).toBe(3);
        });

        it("[index] should return MockEntity at position", () => {
            const {proxy} = createPopulatedProxy();
            expect(proxy[0]).toBeInstanceOf(MockEntity);
            expect(proxy[0].firstName).toBe("Alice");
            expect(proxy[2].firstName).toBe("Charlie");
        });

        it("[index] beyond length should return null", () => {
            const {proxy} = createPopulatedProxy();
            expect(proxy[5]).toBeNull();
        });

        it("map() should iterate all entities", () => {
            const {proxy} = createPopulatedProxy();
            const names = proxy.map(e => e.firstName);
            expect(names).toEqual(["Alice", "Bob", "Charlie"]);
        });

        it("forEach() should call callback for each entity", () => {
            const {proxy} = createPopulatedProxy();
            const collected = [];
            proxy.forEach(e => collected.push(e.firstName));
            expect(collected).toEqual(["Alice", "Bob", "Charlie"]);
        });

        it("filter() should return JS array of matching entities", () => {
            const {proxy} = createPopulatedProxy();
            const result = proxy.filter(e => e.firstName.startsWith("A"));
            expect(result).toHaveLength(1);
            expect(result[0].firstName).toBe("Alice");
        });

        it("find() should return first matching entity", () => {
            const {proxy} = createPopulatedProxy();
            const result = proxy.find(e => e.firstName === "Bob");
            expect(result).toBeInstanceOf(MockEntity);
            expect(result.firstName).toBe("Bob");
        });

        it("find() should return undefined when no match", () => {
            const {proxy} = createPopulatedProxy();
            expect(proxy.find(e => e.firstName === "Zoe")).toBeUndefined();
        });

        it("some() should return true when predicate matches", () => {
            const {proxy} = createPopulatedProxy();
            expect(proxy.some(e => e.firstName === "Bob")).toBe(true);
        });

        it("some() should return false when no match", () => {
            const {proxy} = createPopulatedProxy();
            expect(proxy.some(e => e.firstName === "Zoe")).toBe(false);
        });

        it("every() should work correctly", () => {
            const {proxy} = createPopulatedProxy();
            expect(proxy.every(e => e.voided === false)).toBe(true);
            expect(proxy.every(e => e.firstName === "Alice")).toBe(false);
        });

        it("slice() should return subset", () => {
            const {proxy} = createPopulatedProxy();
            const result = proxy.slice(1, 3);
            expect(result).toHaveLength(2);
            expect(result[0].firstName).toBe("Bob");
            expect(result[1].firstName).toBe("Charlie");
        });

        it("isEmpty() should return false for non-empty", () => {
            const {proxy} = createPopulatedProxy();
            expect(proxy.isEmpty()).toBe(false);
        });

        it("isEmpty() should return true for empty", () => {
            const {proxy} = createProxy({rows: []});
            expect(proxy.isEmpty()).toBe(true);
        });

        it("[Symbol.iterator] should support for...of", () => {
            const {proxy} = createPopulatedProxy();
            const names = [];
            for (const e of proxy) {
                names.push(e.firstName);
            }
            expect(names).toEqual(["Alice", "Bob", "Charlie"]);
        });

        it("asArray() should return array of MockEntity instances", () => {
            const {proxy} = createPopulatedProxy();
            const arr = proxy.asArray();
            expect(arr).toHaveLength(3);
            expect(arr[0]).toBeInstanceOf(MockEntity);
        });
    });

    // ──── Hydration integration ────

    describe("hydration integration", () => {
        it("should call hydrator for each row with correct options", () => {
            const rows = [{uuid: "1"}, {uuid: "2"}];
            const {proxy, hydrator} = createProxy({rows});
            proxy.length; // trigger execution
            expect(hydrator.beginHydrationSession).toHaveBeenCalledTimes(1);
            expect(hydrator.endHydrationSession).toHaveBeenCalledTimes(1);
            expect(hydrator.hydrate).toHaveBeenCalledTimes(2);
            expect(hydrator.hydrate).toHaveBeenCalledWith("Individual", {uuid: "1"}, {skipLists: false, depth: 2});
            expect(hydrator.hydrate).toHaveBeenCalledWith("Individual", {uuid: "2"}, {skipLists: false, depth: 2});
        });

        it("should execute lazily — no SQL until data access", () => {
            const {proxy, executeQuery} = createProxy();
            const filtered = proxy.filtered("voided = false");
            expect(executeQuery).not.toHaveBeenCalled();
            filtered.length; // triggers execution
            expect(executeQuery).toHaveBeenCalledTimes(1);
        });

        it("should execute only once for multiple accesses", () => {
            const {proxy, executeQuery} = createProxy({rows: [{uuid: "1"}]});
            proxy.length;
            proxy[0];
            proxy.map(e => e);
            expect(executeQuery).toHaveBeenCalledTimes(1);
        });
    });

    // ──── camelCase to snake_case in SQL ────

    describe("camelCase → snake_case column conversion", () => {
        it("should convert camelCase fields to snake_case in WHERE", () => {
            const {proxy, executeQuery} = createProxy();
            proxy.filtered("firstName = $0", "Alice").length;
            expect(getExecutedSql(executeQuery)).toContain('t0."first_name" = ?');
        });

        it("should convert multi-word camelCase", () => {
            const {proxy, executeQuery} = createProxy();
            proxy.filtered("dateOfBirth = null").length;
            expect(getExecutedSql(executeQuery)).toContain('t0."date_of_birth" IS NULL');
        });

        it("should convert camelCase in sorted()", () => {
            const {proxy, executeQuery} = createProxy();
            proxy.sorted("dateOfBirth").length;
            expect(getExecutedSql(executeQuery)).toContain('t0."date_of_birth" ASC');
        });

        it("should convert camelCase in aggregates", () => {
            const {proxy, executeQuery} = createProxy();
            executeQuery.mockReturnValue([{max_val: 100}]);
            proxy.max("dateOfBirth");
            expect(getExecutedSql(executeQuery)).toContain('MAX(t0."date_of_birth")');
        });
    });

    // ──── SQL LIMIT ────

    describe("SQL LIMIT propagation", () => {
        it("should include LIMIT in SQL when query is fully SQL-translatable", () => {
            const {proxy, executeQuery} = createProxy({rows: [{uuid: "1", first_name: "Alice"}]});
            proxy.filtered("firstName = $0 limit(1)", "Alice").length;
            const sql = getExecutedSql(executeQuery);
            expect(sql).toContain("LIMIT 1");
            expect(sql).toContain('t0."first_name" = ?');
        });

        it("should NOT include LIMIT in SQL when JS fallback filters are present", () => {
            const rows = [{uuid: "1"}, {uuid: "2"}, {uuid: "3"}];
            const executeQuery = jest.fn(() => rows);
            const hydrator = createMockHydrator(row => ({
                uuid: row.uuid,
                observations: row.uuid === "1" ? [{concept: {uuid: "c1"}}] : [],
            }));

            const proxy = SqliteResultsProxy.create({
                schemaName: "Individual",
                tableName: "individual",
                entityClass: MockEntity,
                executeQuery,
                hydrator,
            });

            // SUBQUERY goes to JS fallback, limit should NOT be in SQL
            const filtered = proxy.filtered(
                'SUBQUERY(observations, $obs, $obs.concept.uuid = "c1").@count > 0 limit(2)'
            );
            filtered.length; // trigger execution
            const sql = getExecutedSql(executeQuery);
            expect(sql).not.toMatch(/LIMIT/i);
        });

        it("should propagate limitClause through sorted()", () => {
            const {proxy, executeQuery} = createProxy({rows: [{uuid: "1", first_name: "Alice"}]});
            proxy.filtered("voided = false limit(3)").sorted("firstName").length;
            const sql = getExecutedSql(executeQuery);
            expect(sql).toContain("ORDER BY");
            expect(sql).toContain("LIMIT 3");
        });

        it("standalone limit(N) with no other filter should produce LIMIT in SQL", () => {
            const {proxy, executeQuery} = createProxy({rows: [{uuid: "1"}]});
            proxy.filtered("limit(5)").length;
            const sql = getExecutedSql(executeQuery);
            expect(sql).toContain("WHERE 1=1");
            expect(sql).toContain("LIMIT 5");
        });
    });

    // ──── Edge cases ────

    describe("edge cases", () => {
        it("should handle empty query string", () => {
            const {proxy, executeQuery} = createProxy({rows: [{uuid: "1"}]});
            proxy.filtered("").length;
            const sql = getExecutedSql(executeQuery);
            expect(sql).toContain("WHERE 1=1");
        });

        it("should handle no filters (bare objects())", () => {
            const {proxy, executeQuery} = createProxy({rows: [{uuid: "1"}, {uuid: "2"}]});
            expect(proxy.length).toBe(2);
            const sql = getExecutedSql(executeQuery);
            expect(sql).not.toContain("WHERE");
        });

        it("should handle multiple ANDs in single query", () => {
            const {proxy, executeQuery} = createProxy();
            proxy.filtered("voided = false AND firstName = $0 AND lastName = $1", "A", "B").length;
            expect(getExecutedParams(executeQuery)).toEqual([0, "A", "B"]);
        });

        it("should handle complex OR-AND combination", () => {
            const {proxy, executeQuery} = createProxy();
            proxy.filtered('uuid = "a" OR uuid = "b" OR uuid = "c"').length;
            expect(getExecutedParams(executeQuery)).toEqual(["a", "b", "c"]);
        });
    });
});
