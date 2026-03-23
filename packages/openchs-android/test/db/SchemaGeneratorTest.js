import {SchemaGenerator, ColumnDef, TableMeta, EMBEDDED_SCHEMA_NAMES, realmTypeToSql} from "../../src/framework/db/SchemaGenerator";

describe("realmTypeToSql", () => {
    it.each([
        ["string", "TEXT"],
        ["bool", "INTEGER"],
        ["int", "INTEGER"],
        ["float", "REAL"],
        ["double", "REAL"],
        ["date", "INTEGER"],
        ["decimal128", "TEXT"],
        ["data", "BLOB"],
        ["unknown", "TEXT"],
    ])("maps %s to %s", (realmType, expected) => {
        expect(realmTypeToSql(realmType)).toBe(expected);
    });
});

describe("SchemaGenerator.parseProperty", () => {
    const schemaPKMap = new Map([["Individual", true], ["Gender", true], ["Observation", false]]);

    it("parses string shorthand", () => {
        const result = SchemaGenerator.parseProperty("name", "string", "uuid", schemaPKMap);
        expect(result.skip).toBe(false);
        expect(result.column.name).toBe("name");
        expect(result.column.sqlType).toBe("TEXT");
        expect(result.column.isPrimaryKey).toBe(false);
    });

    it("parses optional string shorthand", () => {
        const result = SchemaGenerator.parseProperty("middleName", "string?", "uuid", schemaPKMap);
        expect(result.column.isOptional).toBe(true);
        expect(result.column.sqlType).toBe("TEXT");
    });

    it("marks primary key correctly", () => {
        const result = SchemaGenerator.parseProperty("uuid", "string", "uuid", schemaPKMap);
        expect(result.column.isPrimaryKey).toBe(true);
    });

    it("parses bool type", () => {
        const result = SchemaGenerator.parseProperty("voided", {type: "bool", default: false}, "uuid", schemaPKMap);
        expect(result.column.sqlType).toBe("INTEGER");
        expect(result.column.defaultValue).toBe(false);
    });

    it("parses date type", () => {
        const result = SchemaGenerator.parseProperty("dateOfBirth", "date?", "uuid", schemaPKMap);
        expect(result.column.sqlType).toBe("INTEGER");
        expect(result.column.name).toBe("date_of_birth");
    });

    it("parses object reference (non-embedded) as FK column", () => {
        const result = SchemaGenerator.parseProperty("gender", {type: "object", objectType: "Gender", optional: true}, "uuid", schemaPKMap);
        expect(result.skip).toBe(false);
        expect(result.column.name).toBe("gender_uuid");
        expect(result.column.sqlType).toBe("TEXT");
        expect(result.column.fkTable).toBe("gender");
        expect(result.column.isOptional).toBe(true);
    });

    it("parses embedded object reference as JSON text", () => {
        const result = SchemaGenerator.parseProperty("registrationLocation", {type: "object", objectType: "Point"}, "uuid", schemaPKMap);
        expect(result.skip).toBe(false);
        expect(result.column.name).toBe("registration_location");
        expect(result.column.sqlType).toBe("TEXT");
        expect(result.column.fkTable).toBeNull();
    });

    it("parses list of embedded as JSON text with default []", () => {
        const result = SchemaGenerator.parseProperty("observations", {type: "list", objectType: "Observation"}, "uuid", schemaPKMap);
        expect(result.skip).toBe(false);
        expect(result.column.name).toBe("observations");
        expect(result.column.sqlType).toBe("TEXT");
        expect(result.column.defaultValue).toBe("[]");
    });

    it("skips list of referenced entities", () => {
        const result = SchemaGenerator.parseProperty("enrolments", {type: "list", objectType: "ProgramEnrolment"}, "uuid", schemaPKMap);
        expect(result.skip).toBe(true);
        expect(result.listTarget).toBe("ProgramEnrolment");
    });

    it("parses double type", () => {
        const result = SchemaGenerator.parseProperty("lowAbsolute", {type: "double", optional: true}, "uuid", schemaPKMap);
        expect(result.column.sqlType).toBe("REAL");
        expect(result.column.isOptional).toBe(true);
    });

    it("parses int type", () => {
        const result = SchemaGenerator.parseProperty("pin", {type: "int"}, null, schemaPKMap);
        expect(result.column.sqlType).toBe("INTEGER");
        expect(result.column.isPrimaryKey).toBe(false);
    });
});

describe("SchemaGenerator.generateTable", () => {
    const schemaPKMap = new Map([
        ["Individual", true], ["Gender", true], ["SubjectType", true],
        ["AddressLevel", true], ["ProgramEnrolment", true], ["Encounter", true],
        ["Observation", false], ["Point", false], ["IndividualRelationship", true],
    ]);

    it("generates correct table for a simple schema", () => {
        const schema = {
            name: "Gender",
            primaryKey: "uuid",
            properties: {
                uuid: "string",
                name: "string",
                voided: {type: "bool", default: false},
            },
        };

        const table = SchemaGenerator.generateTable(schema, schemaPKMap);
        expect(table.schemaName).toBe("Gender");
        expect(table.tableName).toBe("gender");
        expect(table.primaryKey).toBe("uuid");
        expect(table.getColumnNames()).toEqual(["uuid", "name", "voided"]);
        expect(table.getColumn("uuid").isPrimaryKey).toBe(true);
        expect(table.getColumn("voided").defaultValue).toBe(false);
    });

    it("generates correct table for complex Individual schema", () => {
        const schema = {
            name: "Individual",
            primaryKey: "uuid",
            properties: {
                uuid: "string",
                name: "string",
                dateOfBirth: {type: "date", optional: true},
                gender: {type: "object", objectType: "Gender", optional: true},
                lowestAddressLevel: {type: "object", objectType: "AddressLevel"},
                voided: {type: "bool", default: false},
                enrolments: {type: "list", objectType: "ProgramEnrolment"},
                encounters: {type: "list", objectType: "Encounter"},
                observations: {type: "list", objectType: "Observation"},
                registrationLocation: {type: "object", objectType: "Point"},
            },
        };

        const table = SchemaGenerator.generateTable(schema, schemaPKMap);
        expect(table.tableName).toBe("individual");
        expect(table.primaryKey).toBe("uuid");

        // FK columns
        expect(table.getColumn("gender_uuid")).toBeTruthy();
        expect(table.getColumn("gender_uuid").fkTable).toBe("gender");
        expect(table.getColumn("lowest_address_level_uuid")).toBeTruthy();

        // Embedded as JSON
        expect(table.getColumn("observations").sqlType).toBe("TEXT");
        expect(table.getColumn("registration_location").sqlType).toBe("TEXT");

        // Lists skipped
        expect(table.getColumn("enrolments")).toBeUndefined();
        expect(table.listProperties).toEqual({
            enrolments: "ProgramEnrolment",
            encounters: "Encounter",
        });
    });

    it("generates table without PK for EntityQueue", () => {
        const schema = {
            name: "EntityQueue",
            properties: {
                savedAt: "date",
                entityUUID: "string",
                entity: "string",
            },
        };

        const table = SchemaGenerator.generateTable(schema, schemaPKMap);
        expect(table.primaryKey).toBeNull();
        expect(table.getColumnNames()).toContain("saved_at");
        expect(table.getColumnNames()).toContain("entity_uuid");
    });

    it("generates table with non-uuid PK for Extension", () => {
        const schema = {
            name: "Extension",
            primaryKey: "url",
            properties: {
                url: "string",
                lastModifiedDateTime: "date",
            },
        };

        const table = SchemaGenerator.generateTable(schema, schemaPKMap);
        expect(table.primaryKey).toBe("url");
        expect(table.getColumn("url").isPrimaryKey).toBe(true);
    });
});

describe("SchemaGenerator.generateAll", () => {
    it("skips embedded schemas", () => {
        const mockConfig = {
            getRealmConfig: () => ({
                schema: [
                    {name: "Individual", primaryKey: "uuid", properties: {uuid: "string"}},
                    {name: "Observation", properties: {concept: {type: "object", objectType: "Concept"}}},
                    {name: "Point", properties: {x: "double", y: "double"}},
                ],
            }),
        };

        const schemaMap = SchemaGenerator.generateAll(mockConfig);
        expect(schemaMap.has("Individual")).toBe(true);
        expect(schemaMap.has("Observation")).toBe(false);
        expect(schemaMap.has("Point")).toBe(false);
        expect(schemaMap.size).toBe(1);
    });
});

describe("SchemaGenerator.generateCreateTableStatements", () => {
    it("generates valid CREATE TABLE SQL", () => {
        const schemaMap = new Map();
        schemaMap.set("Gender", new TableMeta("Gender", "gender", [
            new ColumnDef("uuid", "TEXT", true),
            new ColumnDef("name", "TEXT"),
            new ColumnDef("voided", "INTEGER", false, false, false),
        ], {}, {}));

        const statements = SchemaGenerator.generateCreateTableStatements(schemaMap);
        expect(statements).toHaveLength(1);
        expect(statements[0]).toContain("CREATE TABLE IF NOT EXISTS gender");
        expect(statements[0]).toContain('"uuid" TEXT PRIMARY KEY');
        expect(statements[0]).toContain('"name" TEXT');
        expect(statements[0]).toContain('"voided" INTEGER DEFAULT 0');
    });

    it("includes FK constraints", () => {
        const schemaMap = new Map();
        schemaMap.set("Individual", new TableMeta("Individual", "individual", [
            new ColumnDef("uuid", "TEXT", true),
            new ColumnDef("gender_uuid", "TEXT", false, true, undefined, "gender"),
        ], {}, {}));

        const statements = SchemaGenerator.generateCreateTableStatements(schemaMap);
        expect(statements[0]).toContain('FOREIGN KEY ("gender_uuid") REFERENCES gender("uuid")');
    });

    it("escapes single quotes in string defaults", () => {
        const schemaMap = new Map();
        schemaMap.set("Test", new TableMeta("Test", "test", [
            new ColumnDef("data", "TEXT", false, false, "it's"),
        ], {}, {}));

        const statements = SchemaGenerator.generateCreateTableStatements(schemaMap);
        expect(statements[0]).toContain("DEFAULT 'it''s'");
    });
});

describe("SchemaGenerator.generateIndexStatements", () => {
    it("generates indexes for FK columns", () => {
        const schemaMap = new Map();
        schemaMap.set("Individual", new TableMeta("Individual", "individual", [
            new ColumnDef("uuid", "TEXT", true),
            new ColumnDef("gender_uuid", "TEXT", false, true, undefined, "gender"),
        ], {}, {}));

        const statements = SchemaGenerator.generateIndexStatements(schemaMap);
        expect(statements).toContainEqual(
            expect.stringContaining("idx_individual_gender_uuid")
        );
    });

    it("generates index for voided column", () => {
        const schemaMap = new Map();
        schemaMap.set("Individual", new TableMeta("Individual", "individual", [
            new ColumnDef("uuid", "TEXT", true),
            new ColumnDef("voided", "INTEGER", false, false, false),
        ], {}, {}));

        const statements = SchemaGenerator.generateIndexStatements(schemaMap);
        expect(statements).toContainEqual(
            expect.stringContaining("idx_individual_voided")
        );
    });

    it("generates entity_name index for EntitySyncStatus", () => {
        const schemaMap = new Map();
        schemaMap.set("EntitySyncStatus", new TableMeta("EntitySyncStatus", "entity_sync_status", [
            new ColumnDef("uuid", "TEXT", true),
            new ColumnDef("entity_name", "TEXT"),
        ], {}, {}));

        const statements = SchemaGenerator.generateIndexStatements(schemaMap);
        expect(statements).toContainEqual(
            expect.stringContaining("idx_entity_sync_status_entity_name")
        );
    });
});

describe("SchemaGenerator.buildRealmSchemaMap", () => {
    it("builds map from all schemas", () => {
        const mockConfig = {
            getRealmConfig: () => ({
                schema: [
                    {name: "Individual", primaryKey: "uuid", properties: {}},
                    {name: "Observation", properties: {}},
                ],
            }),
        };

        const map = SchemaGenerator.buildRealmSchemaMap(mockConfig);
        expect(map.size).toBe(2);
        expect(map.has("Individual")).toBe(true);
        expect(map.has("Observation")).toBe(true);
    });
});

describe("EMBEDDED_SCHEMA_NAMES", () => {
    it("contains expected embedded schemas", () => {
        expect(EMBEDDED_SCHEMA_NAMES.has("Observation")).toBe(true);
        expect(EMBEDDED_SCHEMA_NAMES.has("Point")).toBe(true);
        expect(EMBEDDED_SCHEMA_NAMES.has("KeyValue")).toBe(true);
        expect(EMBEDDED_SCHEMA_NAMES.has("ConceptMedia")).toBe(true);
    });

    it("does not contain referenced schemas", () => {
        expect(EMBEDDED_SCHEMA_NAMES.has("Individual")).toBe(false);
        expect(EMBEDDED_SCHEMA_NAMES.has("Concept")).toBe(false);
    });

    it("has exactly 14 entries", () => {
        expect(EMBEDDED_SCHEMA_NAMES.size).toBe(14);
    });
});
