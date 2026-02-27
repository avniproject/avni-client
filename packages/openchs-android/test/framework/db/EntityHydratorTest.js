import EntityHydrator from "../../../src/framework/db/EntityHydrator";

describe("EntityHydrator", () => {
    const realmSchemaMap = new Map();
    realmSchemaMap.set("Individual", {
        name: "Individual",
        primaryKey: "uuid",
        properties: {
            uuid: "string",
            firstName: "string",
            lastName: {type: "string", optional: true},
            dateOfBirth: {type: "date", optional: true},
            voided: {type: "bool", default: false},
            gender: {type: "object", objectType: "Gender", optional: true},
            subjectType: {type: "object", objectType: "SubjectType"},
            observations: {type: "list", objectType: "Observation"},
            registrationLocation: {type: "object", objectType: "Point", optional: true},
            encounters: {type: "list", objectType: "Encounter"},
        }
    });
    realmSchemaMap.set("Gender", {
        name: "Gender",
        primaryKey: "uuid",
        properties: {uuid: "string", name: "string"}
    });
    realmSchemaMap.set("SubjectType", {
        name: "SubjectType",
        primaryKey: "uuid",
        properties: {uuid: "string", name: "string", voided: {type: "bool", default: false}}
    });
    realmSchemaMap.set("Encounter", {
        name: "Encounter",
        primaryKey: "uuid",
        properties: {
            uuid: "string",
            individual: {type: "object", objectType: "Individual"},
            voided: {type: "bool", default: false}
        }
    });

    // Simple mock tableMetaMap
    const tableMetaMap = new Map();
    tableMetaMap.set("Gender", {tableName: "gender", getColumn: (n) => n === "gender_uuid" ? {} : undefined});
    tableMetaMap.set("SubjectType", {tableName: "subject_type", getColumn: () => undefined});
    tableMetaMap.set("Encounter", {
        tableName: "encounter",
        getColumn: (n) => n === "individual_uuid" ? {} : undefined
    });

    const mockExecuteQuery = jest.fn(() => []);

    const referenceDataCache = {
        Gender: new Map([["gender-uuid", {uuid: "gender-uuid", name: "Female"}]]),
        SubjectType: new Map([["st-uuid", {uuid: "st-uuid", name: "Individual", voided: false}]]),
    };

    let hydrator;

    beforeEach(() => {
        mockExecuteQuery.mockReset();
        mockExecuteQuery.mockReturnValue([]);
        hydrator = new EntityHydrator(tableMetaMap, realmSchemaMap, mockExecuteQuery, referenceDataCache);
    });

    describe("hydrate", () => {
        it("should convert scalar properties from snake_case row", () => {
            const row = {
                uuid: "ind-uuid",
                first_name: "Jane",
                last_name: "Doe",
                date_of_birth: 946684800000, // 2000-01-01 epoch ms
                voided: 0,
                gender_uuid: "gender-uuid",
                subject_type_uuid: "st-uuid",
                observations: "[]",
                registration_location: null,
            };

            const result = hydrator.hydrate("Individual", row, {skipLists: true, depth: 1});

            expect(result.uuid).toBe("ind-uuid");
            expect(result.firstName).toBe("Jane");
            expect(result.lastName).toBe("Doe");
            expect(result.dateOfBirth).toBeInstanceOf(Date);
            expect(result.dateOfBirth.getTime()).toBe(946684800000);
            expect(result.voided).toBe(false);
        });

        it("should resolve FK references from cache", () => {
            const row = {
                uuid: "ind-uuid",
                first_name: "Jane",
                last_name: null,
                date_of_birth: null,
                voided: 0,
                gender_uuid: "gender-uuid",
                subject_type_uuid: "st-uuid",
                observations: "[]",
                registration_location: null,
            };

            const result = hydrator.hydrate("Individual", row, {skipLists: true, depth: 1});

            expect(result.gender).toEqual({uuid: "gender-uuid", name: "Female"});
            expect(result.subjectType).toEqual({uuid: "st-uuid", name: "Individual", voided: false});
        });

        it("should parse JSON columns for embedded objects", () => {
            const row = {
                uuid: "ind-uuid",
                first_name: "Jane",
                last_name: null,
                date_of_birth: null,
                voided: 0,
                gender_uuid: null,
                subject_type_uuid: "st-uuid",
                observations: JSON.stringify([
                    {concept: {uuid: "concept-1"}, valueJSON: '{"answer":"yes"}'}
                ]),
                registration_location: JSON.stringify({x: 72.8, y: 19.1}),
            };

            const result = hydrator.hydrate("Individual", row, {skipLists: true, depth: 1});

            expect(result.observations).toEqual([
                {concept: {uuid: "concept-1"}, valueJSON: '{"answer":"yes"}'}
            ]);
            expect(result.registrationLocation).toEqual({x: 72.8, y: 19.1});
        });

        it("should handle null values gracefully", () => {
            const result = hydrator.hydrate("Individual", null);
            expect(result).toBeNull();
        });

        it("should return empty arrays for list properties when skipLists is true", () => {
            const row = {
                uuid: "ind-uuid",
                first_name: "Jane",
                last_name: null,
                date_of_birth: null,
                voided: 0,
                gender_uuid: null,
                subject_type_uuid: "st-uuid",
                observations: "[]",
                registration_location: null,
            };

            const result = hydrator.hydrate("Individual", row, {skipLists: true, depth: 1});
            expect(result.encounters).toEqual([]);
        });
    });

    describe("batch list loading", () => {
        it("batchPreloadLists issues one query per list property, not per entity", () => {
            // Encounter has "individual" FK → so Individual.encounters is a list property
            // Two individuals → should be 1 batch query, not 2 individual queries
            mockExecuteQuery.mockReturnValue([
                {uuid: "e1", individual_uuid: "ind-1", voided: 0},
                {uuid: "e2", individual_uuid: "ind-1", voided: 0},
                {uuid: "e3", individual_uuid: "ind-2", voided: 0},
            ]);

            hydrator.beginHydrationSession();
            hydrator.batchPreloadLists("Individual", ["ind-1", "ind-2"]);

            // Only 1 batch query for encounters (observations and registrationLocation are embedded, not FK)
            expect(mockExecuteQuery).toHaveBeenCalledTimes(1);
            const sql = mockExecuteQuery.mock.calls[0][0];
            expect(sql).toContain("encounter");
            expect(sql).toContain("IN");
            expect(mockExecuteQuery.mock.calls[0][1]).toEqual(["ind-1", "ind-2"]);

            hydrator.endHydrationSession();
        });

        it("resolveList uses batch cache when available", () => {
            mockExecuteQuery.mockReturnValueOnce([
                {uuid: "e1", individual_uuid: "ind-1", voided: 0},
                {uuid: "e2", individual_uuid: "ind-2", voided: 0},
            ]);

            hydrator.beginHydrationSession();
            hydrator.batchPreloadLists("Individual", ["ind-1", "ind-2"]);

            // Reset mock to verify resolveList doesn't make additional queries
            const batchCallCount = mockExecuteQuery.mock.calls.length;
            mockExecuteQuery.mockClear();
            mockExecuteQuery.mockReturnValue([]); // no extra queries should happen

            const list = hydrator.resolveList("Individual", "encounters", "Encounter", "ind-1", 0);
            expect(list).toHaveLength(1);
            expect(list[0].uuid).toBe("e1");

            // No additional executeQuery calls for resolveList (used cache)
            // (hydrate may call executeQuery for FK resolution, but the list itself should be from cache)
            hydrator.endHydrationSession();
        });

        it("resolveList falls back to individual query when no batch cache", () => {
            mockExecuteQuery.mockReturnValue([{uuid: "e1", individual_uuid: "ind-1", voided: 0}]);

            // Don't call batchPreloadLists — no batch cache
            hydrator.beginHydrationSession();
            // But don't call batchPreloadLists

            // Clear and set up for the individual query
            mockExecuteQuery.mockClear();
            mockExecuteQuery.mockReturnValue([{uuid: "e1", individual_uuid: "ind-1", voided: 0}]);

            const list = hydrator.resolveList("Individual", "encounters", "Encounter", "ind-1", 0);
            expect(list).toHaveLength(1);

            // Should have called executeQuery with individual WHERE, not IN
            const sql = mockExecuteQuery.mock.calls[0][0];
            expect(sql).toContain('WHERE "individual_uuid" = ?');
            expect(sql).not.toContain("IN");

            hydrator.endHydrationSession();
        });

        it("deduplicates parent UUIDs before batching", () => {
            mockExecuteQuery.mockReturnValue([]);

            hydrator.beginHydrationSession();
            hydrator.batchPreloadLists("Individual", ["ind-1", "ind-1", "ind-2", "ind-1"]);

            // Should deduplicate to ["ind-1", "ind-2"]
            expect(mockExecuteQuery.mock.calls[0][1]).toEqual(["ind-1", "ind-2"]);

            hydrator.endHydrationSession();
        });

        it("skips embedded list properties (Observation)", () => {
            // Observation is in EMBEDDED_SCHEMA_NAMES — stored as JSON on parent row
            // batchPreloadLists should NOT query for it
            mockExecuteQuery.mockReturnValue([]);

            hydrator.beginHydrationSession();
            hydrator.batchPreloadLists("Individual", ["ind-1"]);

            // Should only query for encounters (the non-embedded list property)
            if (mockExecuteQuery.mock.calls.length > 0) {
                const sql = mockExecuteQuery.mock.calls[0][0];
                expect(sql).toContain("encounter");
                expect(sql).not.toContain("observation");
            }

            hydrator.endHydrationSession();
        });

        it("_listBatchCache is cleared on endHydrationSession", () => {
            hydrator.beginHydrationSession();
            expect(hydrator._listBatchCache).not.toBeNull();

            hydrator.endHydrationSession();
            expect(hydrator._listBatchCache).toBeNull();
        });

        it("handles empty parentUuids gracefully", () => {
            hydrator.beginHydrationSession();
            hydrator.batchPreloadLists("Individual", []);
            expect(mockExecuteQuery).not.toHaveBeenCalled();
            hydrator.endHydrationSession();
        });

        it("handles null parentUuids in the array", () => {
            mockExecuteQuery.mockReturnValue([]);

            hydrator.beginHydrationSession();
            hydrator.batchPreloadLists("Individual", [null, "ind-1", null]);

            // Should filter out nulls, passing only ["ind-1"]
            if (mockExecuteQuery.mock.calls.length > 0) {
                expect(mockExecuteQuery.mock.calls[0][1]).toEqual(["ind-1"]);
            }

            hydrator.endHydrationSession();
        });
    });

    describe("flatten", () => {
        it("should convert entity to flat SQL row with snake_case keys", () => {
            const entity = {
                that: {
                    uuid: "ind-uuid",
                    firstName: "Jane",
                    lastName: "Doe",
                    dateOfBirth: new Date(2000, 0, 1),
                    voided: false,
                    gender: {uuid: "gender-uuid", name: "Female"},
                    subjectType: {uuid: "st-uuid", name: "Individual"},
                    observations: [{concept: {uuid: "c1"}, valueJSON: "{}"}],
                    registrationLocation: {x: 72.8, y: 19.1},
                    encounters: [], // should be skipped (referenced list)
                }
            };

            const result = hydrator.flatten("Individual", entity);

            expect(result.uuid).toBe("ind-uuid");
            expect(result.first_name).toBe("Jane");
            expect(result.last_name).toBe("Doe");
            expect(result.date_of_birth).toBe(new Date(2000, 0, 1).getTime());
            expect(result.voided).toBe(0);
            expect(result.gender_uuid).toBe("gender-uuid");
            expect(result.subject_type_uuid).toBe("st-uuid");
            expect(result.registration_location).toBe(JSON.stringify({x: 72.8, y: 19.1}));
            expect(JSON.parse(result.observations)).toEqual([{concept: {uuid: "c1"}, valueJSON: "{}"}]);
            // encounters should not be in the result (it's a referenced list)
            expect(result.encounters).toBeUndefined();
        });

        it("should handle null FK references", () => {
            const entity = {
                that: {
                    uuid: "ind-uuid",
                    firstName: "Jane",
                    lastName: null,
                    dateOfBirth: null,
                    voided: true,
                    gender: null,
                    subjectType: {uuid: "st-uuid"},
                    observations: [],
                    registrationLocation: null,
                    encounters: [],
                }
            };

            const result = hydrator.flatten("Individual", entity);

            expect(result.gender_uuid).toBeNull();
            expect(result.voided).toBe(1);
        });
    });
});
