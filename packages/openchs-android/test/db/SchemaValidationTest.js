import {EntityMappingConfig} from "openchs-models";
import {SchemaGenerator, EMBEDDED_SCHEMA_NAMES} from "../../src/framework/db/SchemaGenerator";
import {getTableConfig} from "drizzle-orm/sqlite-core";

describe("Schema Validation against EntityMappingConfig", () => {
    let entityMappingConfig;
    let allSchemas;
    let tableMetaMap;

    beforeAll(() => {
        entityMappingConfig = EntityMappingConfig.getInstance();
        allSchemas = entityMappingConfig.getRealmConfig().schema;
        tableMetaMap = SchemaGenerator.generateAll(entityMappingConfig);
    });

    it("accounts for all schemas as either embedded or table", () => {
        const embeddedCount = allSchemas.filter(s => EMBEDDED_SCHEMA_NAMES.has(s.name)).length;
        const tableCount = tableMetaMap.size;
        expect(embeddedCount + tableCount).toBe(allSchemas.length);
    });

    it("all embedded schemas in config are recognized", () => {
        const embeddedInConfig = allSchemas.filter(s => EMBEDDED_SCHEMA_NAMES.has(s.name));
        // Not all 14 EMBEDDED_SCHEMA_NAMES are registered in EntityMappingConfig —
        // some (KeyValue, Format, ChecklistItemStatus, StringKeyNumericValue) only exist
        // as objectType references and aren't registered separately. Their "Embedded"
        // variants (EmbeddedKeyValue, etc.) are registered instead.
        expect(embeddedInConfig.length).toBeGreaterThan(0);
        embeddedInConfig.forEach(s => {
            expect(EMBEDDED_SCHEMA_NAMES.has(s.name)).toBe(true);
        });
    });

    it("generates tables for all non-embedded schemas", () => {
        const nonEmbedded = allSchemas.filter(s => !EMBEDDED_SCHEMA_NAMES.has(s.name));
        nonEmbedded.forEach(schema => {
            expect(tableMetaMap.has(schema.name)).toBe(true);
        });
    });

    it("every non-embedded schema produces a valid CREATE TABLE statement", () => {
        const statements = SchemaGenerator.generateCreateTableStatements(tableMetaMap);
        expect(statements.length).toBe(tableMetaMap.size);
        statements.forEach(sql => {
            expect(sql).toMatch(/^CREATE TABLE IF NOT EXISTS \w+/);
        });
    });

    it("schemas with uuid PK have uuid TEXT PRIMARY KEY", () => {
        tableMetaMap.forEach((tableMeta) => {
            if (tableMeta.primaryKey === "uuid") {
                const uuidCol = tableMeta.getColumn("uuid");
                expect(uuidCol).toBeTruthy();
                expect(uuidCol.isPrimaryKey).toBe(true);
                expect(uuidCol.sqlType).toBe("TEXT");
            }
        });
    });

    it("EntityQueue has no PRIMARY KEY", () => {
        const entityQueue = tableMetaMap.get("EntityQueue");
        expect(entityQueue).toBeTruthy();
        expect(entityQueue.primaryKey).toBeNull();
    });

    it("BeneficiaryModePin has no PRIMARY KEY", () => {
        const pin = tableMetaMap.get("BeneficiaryModePin");
        expect(pin).toBeTruthy();
        expect(pin.primaryKey).toBeNull();
    });

    it("Extension has url as PRIMARY KEY", () => {
        const ext = tableMetaMap.get("Extension");
        expect(ext).toBeTruthy();
        expect(ext.primaryKey).toBe("url");
        expect(ext.getColumn("url").isPrimaryKey).toBe(true);
    });

    it("FK columns reference tables that exist in the schema map", () => {
        tableMetaMap.forEach((tableMeta) => {
            tableMeta.getForeignKeyColumns().forEach(col => {
                const referencedTableExists = Array.from(tableMetaMap.values()).some(
                    t => t.tableName === col.fkTable
                );
                expect(referencedTableExists).toBe(true);
            });
        });
    });

    it("no table has duplicate column names", () => {
        tableMetaMap.forEach((tableMeta) => {
            const names = tableMeta.getColumnNames();
            const uniqueNames = new Set(names);
            expect(uniqueNames.size).toBe(names.length);
        });
    });

    it("all index statements are well-formed", () => {
        const statements = SchemaGenerator.generateIndexStatements(tableMetaMap);
        expect(statements.length).toBeGreaterThan(0);
        statements.forEach(sql => {
            expect(sql).toMatch(/^CREATE INDEX IF NOT EXISTS idx_\w+ ON \w+\("/);
        });
    });

    it("table count matches non-embedded schema count", () => {
        const nonEmbeddedCount = allSchemas.filter(s => !EMBEDDED_SCHEMA_NAMES.has(s.name)).length;
        expect(tableMetaMap.size).toBe(nonEmbeddedCount);
    });

    it("realmSchemaMap includes all schemas", () => {
        const realmSchemaMap = SchemaGenerator.buildRealmSchemaMap(entityMappingConfig);
        expect(realmSchemaMap.size).toBe(allSchemas.length);
    });

    it("every table has at least one column", () => {
        tableMetaMap.forEach((tableMeta) => {
            expect(tableMeta.columns.length).toBeGreaterThan(0);
        });
    });

    it("DDL for tables without PK does not contain PRIMARY KEY", () => {
        const noPkSchemas = ["EntityQueue", "BeneficiaryModePin"];
        const statements = SchemaGenerator.generateCreateTableStatements(tableMetaMap);
        const statementsMap = new Map();
        statements.forEach(sql => {
            const match = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/);
            if (match) statementsMap.set(match[1], sql);
        });

        noPkSchemas.forEach(name => {
            const tableMeta = tableMetaMap.get(name);
            const sql = statementsMap.get(tableMeta.tableName);
            expect(sql).toBeTruthy();
            expect(sql).not.toContain("PRIMARY KEY");
        });
    });
});

describe("DrizzleSchemaExport drift detection", () => {
    // Verifies that DrizzleSchemaExport.js (CJS, inlined logic) and
    // SchemaGenerator.js (ESM, canonical) produce the same table/column structure.
    // If this test fails, the inlined logic in DrizzleSchemaExport has drifted.

    let drizzleTables;
    let schemaGenMap;

    beforeAll(() => {
        drizzleTables = require("../../src/framework/db/DrizzleSchemaExport");
        const entityMappingConfig = EntityMappingConfig.getInstance();
        schemaGenMap = SchemaGenerator.generateAll(entityMappingConfig);
    });

    it("produces the same set of table names", () => {
        const drizzleTableNames = new Set(Object.keys(drizzleTables));
        const schemaGenTableNames = new Set(
            Array.from(schemaGenMap.values()).map(t => t.tableName)
        );
        expect(drizzleTableNames).toEqual(schemaGenTableNames);
    });

    it("produces the same columns for every table", () => {
        const mismatches = [];

        schemaGenMap.forEach((tableMeta) => {
            const drizzleTable = drizzleTables[tableMeta.tableName];
            if (!drizzleTable) {
                mismatches.push(`Missing table: ${tableMeta.tableName}`);
                return;
            }

            const config = getTableConfig(drizzleTable);
            const drizzleColNames = new Set(config.columns.map(c => c.name));
            const schemaGenColNames = new Set(tableMeta.getColumnNames());

            const missingInDrizzle = [...schemaGenColNames].filter(c => !drizzleColNames.has(c));
            const extraInDrizzle = [...drizzleColNames].filter(c => !schemaGenColNames.has(c));

            if (missingInDrizzle.length > 0 || extraInDrizzle.length > 0) {
                mismatches.push(
                    `Table ${tableMeta.tableName}: ` +
                    (missingInDrizzle.length > 0 ? `missing in drizzle: [${missingInDrizzle}] ` : "") +
                    (extraInDrizzle.length > 0 ? `extra in drizzle: [${extraInDrizzle}]` : "")
                );
            }
        });

        expect(mismatches).toEqual([]);
    });
});
