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
