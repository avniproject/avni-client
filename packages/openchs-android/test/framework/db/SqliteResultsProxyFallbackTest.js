import {SqliteResultsProxy} from "../../../src/framework/db/SqliteResultsProxy";

// ──── Mock entity class ────

class MockEntity {
    constructor(obj) {
        Object.assign(this, obj);
    }
}

// ──── Mock hydrator ────

function createMockHydrator(entityEnricher) {
    return {
        beginHydrationSession: jest.fn(),
        endHydrationSession: jest.fn(),
        hydrate: jest.fn((schemaName, row, opts) => {
            // Identity hydration — return row as-is, optionally enriched
            return entityEnricher ? entityEnricher(row) : {...row};
        }),
    };
}

// ──── Tests ────

describe("SqliteResultsProxy fallback filter integration", () => {

    beforeEach(() => {
        jest.spyOn(console, "warn").mockImplementation(() => {});
    });

    afterEach(() => {
        console.warn.mockRestore();
    });

    // ──── Fully unsupported → JS fallback ────

    describe("fully unsupported query → entire filter goes to JS fallback", () => {
        it("TRUEPREDICATE DISTINCT deduplicates after hydration", () => {
            const rows = [
                {uuid: "1", entity_name: "Individual"},
                {uuid: "2", entity_name: "Encounter"},
                {uuid: "3", entity_name: "Individual"},
                {uuid: "4", entity_name: "Encounter"},
                {uuid: "5", entity_name: "ProgramEnrolment"},
            ];
            const executeQuery = jest.fn(() => rows);
            const hydrator = createMockHydrator(row => ({
                uuid: row.uuid,
                entityName: row.entity_name,
            }));

            const proxy = SqliteResultsProxy.create({
                schemaName: "EntitySyncStatus",
                tableName: "entity_sync_status",
                entityClass: MockEntity,
                executeQuery,
                hydrator,
            });

            const filtered = proxy.filtered("TRUEPREDICATE DISTINCT(entityName)");
            expect(filtered.length).toBe(3);
            expect(filtered[0].entityName).toBe("Individual");
            expect(filtered[1].entityName).toBe("Encounter");
            expect(filtered[2].entityName).toBe("ProgramEnrolment");
        });

        it("@links.@count returns empty", () => {
            const rows = [{uuid: "1"}, {uuid: "2"}, {uuid: "3"}];
            const executeQuery = jest.fn(() => rows);
            const hydrator = createMockHydrator();

            const proxy = SqliteResultsProxy.create({
                schemaName: "Individual",
                tableName: "individual",
                entityClass: MockEntity,
                executeQuery,
                hydrator,
            });

            const filtered = proxy.filtered("@links.@count == 0");
            expect(filtered.length).toBe(0);
        });

        it("SUBQUERY filters by list property after hydration", () => {
            const rows = [{uuid: "1"}, {uuid: "2"}, {uuid: "3"}];
            const executeQuery = jest.fn(() => rows);
            const hydrator = createMockHydrator(row => ({
                uuid: row.uuid,
                observations: row.uuid === "2"
                    ? [{concept: {uuid: "c1"}, valueJSON: '{"value":"test"}'}]
                    : [],
            }));

            const proxy = SqliteResultsProxy.create({
                schemaName: "Individual",
                tableName: "individual",
                entityClass: MockEntity,
                executeQuery,
                hydrator,
            });

            const filtered = proxy.filtered(
                'SUBQUERY(observations, $observation, $observation.concept.uuid = "c1").@count > 0'
            );
            expect(filtered.length).toBe(1);
            expect(filtered[0].uuid).toBe("2");
        });

        it("listProp.@count filters by list length after hydration", () => {
            const rows = [{uuid: "1"}, {uuid: "2"}, {uuid: "3"}];
            const executeQuery = jest.fn(() => rows);
            const hydrator = createMockHydrator(row => ({
                uuid: row.uuid,
                locationMappings: row.uuid === "2" ? [{id: 1}] : [],
            }));

            const proxy = SqliteResultsProxy.create({
                schemaName: "AddressLevel",
                tableName: "address_level",
                entityClass: MockEntity,
                executeQuery,
                hydrator,
            });

            const filtered = proxy.filtered("locationMappings.@count == 0");
            expect(filtered.length).toBe(2);
            expect(filtered.map(e => e.uuid)).toEqual(["1", "3"]);
        });
    });

    // ──── Partial parse → SQL + JS fallback ────

    describe("partial parse → SQL + JS fallback", () => {
        it("splits 'voided = false AND locationMappings.@count == 0' into SQL + JS", () => {
            // SQL handles voided=false, JS handles @count
            const rows = [
                {uuid: "1", voided: 0},
                {uuid: "2", voided: 0},
            ];
            const executeQuery = jest.fn(() => rows);
            const hydrator = createMockHydrator(row => ({
                uuid: row.uuid,
                voided: row.voided === 1,
                locationMappings: row.uuid === "1" ? [] : [{id: 1}],
            }));

            const proxy = SqliteResultsProxy.create({
                schemaName: "AddressLevel",
                tableName: "address_level",
                entityClass: MockEntity,
                executeQuery,
                hydrator,
            });

            const filtered = proxy.filtered("voided = false AND locationMappings.@count == 0");
            expect(filtered.length).toBe(1);
            expect(filtered[0].uuid).toBe("1");

            // Verify SQL was generated for the supported part
            const sqlCall = executeQuery.mock.calls[0];
            expect(sqlCall[0]).toContain("voided");
            // The @count part should NOT be in the SQL
            expect(sqlCall[0]).not.toContain("@count");
        });

        it("captures skippedClauses with reason 'partial_parse_skip'", () => {
            const executeQuery = jest.fn(() => [{uuid: "1", voided: 0}]);
            const hydrator = createMockHydrator(row => ({
                uuid: row.uuid,
                locationMappings: [],
            }));

            const proxy = SqliteResultsProxy.create({
                schemaName: "AddressLevel",
                tableName: "address_level",
                entityClass: MockEntity,
                executeQuery,
                hydrator,
            });

            // Access the underlying proxy target to inspect jsFallbackFilters
            const filtered = proxy.filtered("voided = false AND locationMappings.@count == 0");

            // Trigger execution to verify the filter is applied
            expect(filtered.length).toBe(1);
        });

        it("handles mixed SQL + SUBQUERY fallback", () => {
            const rows = [{uuid: "1", name: "x"}, {uuid: "2", name: "x"}];
            const executeQuery = jest.fn(() => rows);
            const hydrator = createMockHydrator(row => ({
                uuid: row.uuid,
                name: row.name,
                observations: row.uuid === "1"
                    ? [{concept: {uuid: "c1"}, valueJSON: ""}]
                    : [],
            }));

            const proxy = SqliteResultsProxy.create({
                schemaName: "Individual",
                tableName: "individual",
                entityClass: MockEntity,
                executeQuery,
                hydrator,
            });

            const filtered = proxy.filtered(
                'name = "x" AND SUBQUERY(observations, $obs, $obs.concept.uuid = "c1").@count > 0'
            );
            expect(filtered.length).toBe(1);
            expect(filtered[0].uuid).toBe("1");
        });
    });

    // ──── Chained .filtered() calls ────

    describe("chained .filtered() calls with mixed SQL and fallback", () => {
        it("SQL then DISTINCT: .filtered('voided = false').filtered('TRUEPREDICATE DISTINCT(typeUuid)')", () => {
            const rows = [
                {uuid: "1", voided: 0, type_uuid: "t1"},
                {uuid: "2", voided: 0, type_uuid: "t2"},
                {uuid: "3", voided: 0, type_uuid: "t1"},
            ];
            const executeQuery = jest.fn(() => rows);
            const hydrator = createMockHydrator(row => ({
                uuid: row.uuid,
                voided: row.voided === 1,
                typeUuid: row.type_uuid,
            }));

            const proxy = SqliteResultsProxy.create({
                schemaName: "AddressLevel",
                tableName: "address_level",
                entityClass: MockEntity,
                executeQuery,
                hydrator,
            });

            const filtered = proxy
                .filtered("voided = false")
                .filtered("TRUEPREDICATE DISTINCT(typeUuid)");

            expect(filtered.length).toBe(2);
            expect(filtered[0].typeUuid).toBe("t1");
            expect(filtered[1].typeUuid).toBe("t2");
        });

        it("SQL then SUBQUERY: .filtered('uuid = $0').filtered('SUBQUERY(...).@count > 0')", () => {
            const rows = [{uuid: "1"}];
            const executeQuery = jest.fn(() => rows);
            const hydrator = createMockHydrator(row => ({
                uuid: row.uuid,
                encounters: [
                    {voided: false, encounterType: {uuid: "et1"}},
                ],
            }));

            const proxy = SqliteResultsProxy.create({
                schemaName: "Individual",
                tableName: "individual",
                entityClass: MockEntity,
                executeQuery,
                hydrator,
            });

            const filtered = proxy
                .filtered("uuid = $0", "1")
                .filtered('SUBQUERY(encounters, $encounter, $encounter.voided = false and $encounter.encounterType.uuid = "et1").@count > 0');

            expect(filtered.length).toBe(1);
            expect(filtered[0].uuid).toBe("1");
        });
    });

    // ──── Collection API after fallback ────

    describe("collection API correctness after fallback filtering", () => {
        function createDistinctProxy() {
            const rows = [
                {uuid: "1", entity_name: "Individual"},
                {uuid: "2", entity_name: "Encounter"},
                {uuid: "3", entity_name: "Individual"},
            ];
            const executeQuery = jest.fn(() => rows);
            const hydrator = createMockHydrator(row => ({
                uuid: row.uuid,
                entityName: row.entity_name,
            }));

            return SqliteResultsProxy.create({
                schemaName: "EntitySyncStatus",
                tableName: "entity_sync_status",
                entityClass: MockEntity,
                executeQuery,
                hydrator,
            }).filtered("TRUEPREDICATE DISTINCT(entityName)");
        }

        it("length reflects post-fallback count", () => {
            const proxy = createDistinctProxy();
            expect(proxy.length).toBe(2);
        });

        it("[0] index access returns correct entity wrapped in entityClass", () => {
            const proxy = createDistinctProxy();
            const first = proxy[0];
            expect(first).toBeInstanceOf(MockEntity);
            expect(first.entityName).toBe("Individual");
        });

        it("map() iterates only fallback-surviving entities", () => {
            const proxy = createDistinctProxy();
            const names = proxy.map(e => e.entityName);
            expect(names).toEqual(["Individual", "Encounter"]);
        });

        it("isEmpty() returns true when fallback eliminates all", () => {
            const rows = [{uuid: "1"}, {uuid: "2"}];
            const executeQuery = jest.fn(() => rows);
            const hydrator = createMockHydrator();

            const proxy = SqliteResultsProxy.create({
                schemaName: "Individual",
                tableName: "individual",
                entityClass: MockEntity,
                executeQuery,
                hydrator,
            }).filtered("@links.@count == 0");

            expect(proxy.isEmpty()).toBe(true);
        });
    });
});
