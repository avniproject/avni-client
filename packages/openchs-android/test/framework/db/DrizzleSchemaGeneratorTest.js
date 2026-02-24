import DrizzleSchemaGenerator, {EMBEDDED_SCHEMA_NAMES} from "../../../src/framework/db/DrizzleSchemaGenerator";

describe("DrizzleSchemaGenerator", () => {
    const mockEntityMappingConfig = {
        getRealmConfig: () => ({
            schema: [
                {
                    name: "Individual",
                    primaryKey: "uuid",
                    properties: {
                        uuid: "string",
                        name: "string",
                        firstName: "string",
                        lastName: {type: "string", optional: true},
                        dateOfBirth: {type: "date", optional: true},
                        dateOfBirthVerified: {type: "bool", optional: true},
                        gender: {type: "object", objectType: "Gender", optional: true},
                        subjectType: {type: "object", objectType: "SubjectType"},
                        lowestAddressLevel: {type: "object", objectType: "AddressLevel"},
                        registrationDate: "date",
                        voided: {type: "bool", default: false},
                        enrolments: {type: "list", objectType: "ProgramEnrolment"},
                        encounters: {type: "list", objectType: "Encounter"},
                        observations: {type: "list", objectType: "Observation"},
                        registrationLocation: {type: "object", objectType: "Point", optional: true},
                    }
                },
                {
                    name: "Gender",
                    primaryKey: "uuid",
                    properties: {
                        uuid: "string",
                        name: "string",
                    }
                },
                {
                    name: "SubjectType",
                    primaryKey: "uuid",
                    properties: {
                        uuid: "string",
                        name: "string",
                        voided: {type: "bool", default: false},
                        active: {type: "bool", default: true},
                    }
                },
                {
                    name: "AddressLevel",
                    primaryKey: "uuid",
                    properties: {
                        uuid: "string",
                        name: "string",
                        level: "double",
                        voided: {type: "bool", default: false},
                    }
                },
                {
                    name: "EntitySyncStatus",
                    primaryKey: "uuid",
                    properties: {
                        uuid: "string",
                        entityName: "string",
                        loadedSince: "date",
                        entityTypeUuid: "string",
                    }
                },
                // Embedded schemas (should be skipped for table creation)
                {
                    name: "Observation",
                    properties: {
                        concept: {type: "object", objectType: "Concept"},
                        valueJSON: "string",
                    }
                },
                {
                    name: "Point",
                    properties: {
                        x: "double",
                        y: "double",
                    }
                },
                {
                    name: "ProgramEnrolment",
                    primaryKey: "uuid",
                    properties: {
                        uuid: "string",
                        individual: {type: "object", objectType: "Individual"},
                        observations: {type: "list", objectType: "Observation"},
                        voided: {type: "bool", default: false},
                    }
                },
                {
                    name: "Encounter",
                    primaryKey: "uuid",
                    properties: {
                        uuid: "string",
                        individual: {type: "object", objectType: "Individual"},
                        encounterType: {type: "object", objectType: "EncounterType"},
                        voided: {type: "bool", default: false},
                    }
                },
            ]
        })
    };

    describe("generateAll", () => {
        it("should generate table metadata for non-embedded schemas", () => {
            const result = DrizzleSchemaGenerator.generateAll(mockEntityMappingConfig);
            expect(result.size).toBeGreaterThan(0);

            // Embedded schemas should not have tables
            expect(result.has("Observation")).toBe(false);
            expect(result.has("Point")).toBe(false);

            // Non-embedded schemas should have tables
            expect(result.has("Individual")).toBe(true);
            expect(result.has("Gender")).toBe(true);
            expect(result.has("SubjectType")).toBe(true);
        });

        it("should generate correct table name", () => {
            const result = DrizzleSchemaGenerator.generateAll(mockEntityMappingConfig);
            const individual = result.get("Individual");
            expect(individual.tableName).toBe("individual");

            const entitySyncStatus = result.get("EntitySyncStatus");
            expect(entitySyncStatus.tableName).toBe("entity_sync_status");
        });

        it("should identify primary key", () => {
            const result = DrizzleSchemaGenerator.generateAll(mockEntityMappingConfig);
            const individual = result.get("Individual");
            expect(individual.primaryKey).toBe("uuid");
        });
    });

    describe("column generation", () => {
        let tableMetaMap;

        beforeAll(() => {
            tableMetaMap = DrizzleSchemaGenerator.generateAll(mockEntityMappingConfig);
        });

        it("should convert string properties to TEXT columns", () => {
            const individual = tableMetaMap.get("Individual");
            const nameCol = individual.getColumn("name");
            expect(nameCol).toBeDefined();
            expect(nameCol.sqlType).toBe("TEXT");
        });

        it("should convert date properties to INTEGER columns", () => {
            const individual = tableMetaMap.get("Individual");
            const regDate = individual.getColumn("registration_date");
            expect(regDate).toBeDefined();
            expect(regDate.sqlType).toBe("INTEGER");
        });

        it("should convert bool properties to INTEGER columns", () => {
            const individual = tableMetaMap.get("Individual");
            const voided = individual.getColumn("voided");
            expect(voided).toBeDefined();
            expect(voided.sqlType).toBe("INTEGER");
        });

        it("should convert object references to FK columns (propName_uuid)", () => {
            const individual = tableMetaMap.get("Individual");
            const genderFk = individual.getColumn("gender_uuid");
            expect(genderFk).toBeDefined();
            expect(genderFk.sqlType).toBe("TEXT");
            expect(genderFk.fkTable).toBe("gender");
        });

        it("should convert embedded object references to JSON columns", () => {
            const individual = tableMetaMap.get("Individual");
            const regLocation = individual.getColumn("registration_location");
            expect(regLocation).toBeDefined();
            expect(regLocation.sqlType).toBe("TEXT"); // JSON stored as text
            expect(regLocation.fkTable).toBeNull();
        });

        it("should skip list properties for referenced entities", () => {
            const individual = tableMetaMap.get("Individual");
            // enrolments is a list of ProgramEnrolment — should NOT be a column
            expect(individual.getColumn("enrolments")).toBeUndefined();
            // But should be tracked in listProperties
            expect(individual.listProperties["enrolments"]).toBe("ProgramEnrolment");
        });

        it("should store list of embedded objects as JSON column", () => {
            const individual = tableMetaMap.get("Individual");
            const observations = individual.getColumn("observations");
            expect(observations).toBeDefined();
            expect(observations.sqlType).toBe("TEXT");
        });
    });

    describe("generateCreateTableStatements", () => {
        it("should generate valid CREATE TABLE SQL", () => {
            const tableMetaMap = DrizzleSchemaGenerator.generateAll(mockEntityMappingConfig);
            const statements = DrizzleSchemaGenerator.generateCreateTableStatements(tableMetaMap);

            expect(statements.length).toBeGreaterThan(0);

            // Find the Individual table DDL
            const individualDDL = statements.find(s => s.includes("CREATE TABLE IF NOT EXISTS individual"));
            expect(individualDDL).toBeDefined();
            expect(individualDDL).toContain('"uuid" TEXT PRIMARY KEY');
            expect(individualDDL).toContain('"gender_uuid" TEXT');
            expect(individualDDL).toContain('FOREIGN KEY ("gender_uuid") REFERENCES gender("uuid")');
        });
    });

    describe("generateIndexStatements", () => {
        it("should generate indexes for FK columns", () => {
            const tableMetaMap = DrizzleSchemaGenerator.generateAll(mockEntityMappingConfig);
            const statements = DrizzleSchemaGenerator.generateIndexStatements(tableMetaMap);

            expect(statements.length).toBeGreaterThan(0);
            const fkIndex = statements.find(s => s.includes("idx_individual_gender_uuid"));
            expect(fkIndex).toBeDefined();
        });

        it("should generate indexes for voided columns", () => {
            const tableMetaMap = DrizzleSchemaGenerator.generateAll(mockEntityMappingConfig);
            const statements = DrizzleSchemaGenerator.generateIndexStatements(tableMetaMap);

            const voidedIndex = statements.find(s => s.includes("idx_individual_voided"));
            expect(voidedIndex).toBeDefined();
        });
    });

    describe("EMBEDDED_SCHEMA_NAMES", () => {
        it("should include Observation and Point", () => {
            expect(EMBEDDED_SCHEMA_NAMES.has("Observation")).toBe(true);
            expect(EMBEDDED_SCHEMA_NAMES.has("Point")).toBe(true);
        });

        it("should not include entities with primary keys", () => {
            expect(EMBEDDED_SCHEMA_NAMES.has("Individual")).toBe(false);
            expect(EMBEDDED_SCHEMA_NAMES.has("Concept")).toBe(false);
        });
    });
});
