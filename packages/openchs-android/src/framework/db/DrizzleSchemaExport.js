/**
 * DrizzleSchemaExport - Generates Drizzle ORM table definitions for drizzle-kit.
 *
 * Converts Realm schema definitions from EntityMappingConfig into Drizzle ORM
 * sqliteTable() definitions that drizzle-kit can diff to produce migration SQL.
 *
 * This file is consumed by drizzle-kit via drizzle.config.js.
 * It runs in plain Node.js (CJS), NOT through the RN babel pipeline.
 * It does NOT import from ESM source files — all needed logic is inlined.
 *
 * IMPORTANT: The Realm→SQL conversion logic here is duplicated from
 * SqliteUtils.js and SchemaGenerator.js (which are ESM). If you change
 * EMBEDDED_SCHEMA_NAMES, camelToSnake, or realmTypeToSql in those files,
 * update the corresponding logic here. A drift-detection test in
 * SchemaValidationTest.js verifies both produce the same output.
 *
 * Usage: npx drizzle-kit generate
 */

const {sqliteTable, text, integer, real, blob, index, foreignKey} = require("drizzle-orm/sqlite-core");
const {EntityMappingConfig} = require("openchs-models");

// --- Inlined from SqliteUtils.js (CJS-compatible) ---

function camelToSnake(str) {
    return str
        .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
        .replace(/([a-z\d])([A-Z])/g, "$1_$2")
        .toLowerCase();
}

function schemaNameToTableName(schemaName) {
    return camelToSnake(schemaName);
}

function normalizeRealmType(realmType) {
    if (typeof realmType === "string" && realmType.endsWith("?")) {
        return realmType.slice(0, -1);
    }
    return realmType;
}

// --- Inlined from SchemaGenerator.js (CJS-compatible) ---

const EMBEDDED_SCHEMA_NAMES = new Set([
    "Observation", "Point", "SubjectLocation", "KeyValue", "EmbeddedKeyValue",
    "Format", "EmbeddedFormat", "ChecklistItemStatus", "EmbeddedChecklistItemStatus",
    "StringKeyNumericValue", "EmbeddedStringKeyNumericValue", "ConceptMedia",
    "ReportCardResult", "NestedReportCardResult",
]);

// Keep in sync with ADDITIONAL_INDEXES in SchemaGenerator.js.
const ADDITIONAL_INDEXES = {
    address_level: ["parent_uuid", "type_uuid"],
    location_hierarchy: ["parent_uuid", "type_uuid"],
    individual: ["registration_date"],
    encounter: ["encounter_date_time"],
    program_enrolment: ["enrolment_date_time"],
};

function realmTypeToSql(realmType) {
    switch (realmType) {
        case "string": return "TEXT";
        case "bool":
        case "int": return "INTEGER";
        case "float":
        case "double": return "REAL";
        case "date": return "INTEGER";
        case "decimal128": return "TEXT";
        case "data": return "BLOB";
        default: return "TEXT";
    }
}

const sqlTypeToBuilder = {TEXT: text, INTEGER: integer, REAL: real, BLOB: blob};

// --- Build Drizzle tables from Realm schemas ---

function buildDrizzleTables() {
    const schemas = EntityMappingConfig.getInstance().getRealmConfig().schema;

    // Pass 1: Create bare tables (columns only, no FK references yet)
    // We need all table objects to exist before we can add .references()
    const tables = {};
    const tableColumns = {};  // tableName → { colName: columnBuilder }
    const fkDefs = [];        // [{ tableName, colName, targetTableName }]
    const indexDefs = [];      // [{ tableName, colName, indexName }]

    for (const schema of schemas) {
        if (EMBEDDED_SCHEMA_NAMES.has(schema.name)) continue;

        const tableName = schemaNameToTableName(schema.name);
        const columnDefs = {};
        const properties = schema.properties || {};

        for (const [propName, propDef] of Object.entries(properties)) {
            let colName, sqlType, isPK = false, defaultVal;
            let isFk = false, fkTargetTable = null;

            if (typeof propDef === "string") {
                const normalized = normalizeRealmType(propDef);
                colName = camelToSnake(propName);
                sqlType = realmTypeToSql(normalized);
                isPK = propName === schema.primaryKey;
            } else if (propDef.type === "object") {
                if (EMBEDDED_SCHEMA_NAMES.has(propDef.objectType)) {
                    colName = camelToSnake(propName);
                    sqlType = "TEXT";
                    defaultVal = propDef.default != null ? JSON.stringify(propDef.default) : undefined;
                } else {
                    colName = `${camelToSnake(propName)}_uuid`;
                    sqlType = "TEXT";
                    isFk = true;
                    fkTargetTable = schemaNameToTableName(propDef.objectType);
                }
            } else if (propDef.type === "list") {
                if (EMBEDDED_SCHEMA_NAMES.has(propDef.objectType)) {
                    colName = camelToSnake(propName);
                    sqlType = "TEXT";
                    defaultVal = "[]";
                } else {
                    continue; // FK on child table, skip
                }
            } else {
                colName = camelToSnake(propName);
                sqlType = realmTypeToSql(propDef.type);
                isPK = propName === schema.primaryKey;
                defaultVal = propDef.default;
            }

            const builder = sqlTypeToBuilder[sqlType] || text;
            let column = builder(colName);
            if (isPK) column = column.primaryKey();
            if (defaultVal !== undefined) {
                if (typeof defaultVal === "boolean") {
                    column = column.default(defaultVal ? 1 : 0);
                } else {
                    column = column.default(defaultVal);
                }
            }

            columnDefs[colName] = column;

            if (isFk) {
                fkDefs.push({tableName, colName, targetTableName: fkTargetTable});
                indexDefs.push({tableName, colName, indexName: `idx_${tableName}_${colName}`});
            }
        }

        // Add voided index if column exists
        if (columnDefs["voided"]) {
            indexDefs.push({tableName, colName: "voided", indexName: `idx_${tableName}_voided`});
        }

        // Special index for EntitySyncStatus
        if (schema.name === "EntitySyncStatus" && columnDefs["entity_name"]) {
            indexDefs.push({tableName, colName: "entity_name", indexName: `idx_${tableName}_entity_name`});
        }

        const additionalCols = ADDITIONAL_INDEXES[tableName];
        if (additionalCols) {
            for (const colName of additionalCols) {
                if (columnDefs[colName]) {
                    indexDefs.push({tableName, colName, indexName: `idx_${tableName}_${colName}`});
                }
            }
        }

        tableColumns[tableName] = columnDefs;
    }

    // Pass 2: Create sqliteTable with FK constraints and indexes via the callback
    for (const [tableName, columnDefs] of Object.entries(tableColumns)) {
        const tableFks = fkDefs.filter(f => f.tableName === tableName);
        const tableIdxs = indexDefs.filter(i => i.tableName === tableName);

        if (tableFks.length === 0 && tableIdxs.length === 0) {
            tables[tableName] = sqliteTable(tableName, columnDefs);
        } else {
            tables[tableName] = sqliteTable(tableName, columnDefs, (table) => {
                const extras = [];

                for (const fk of tableFks) {
                    const targetCols = tableColumns[fk.targetTableName];
                    if (targetCols && targetCols["uuid"]) {
                        extras.push(
                            foreignKey({
                                columns: [table[fk.colName]],
                                foreignColumns: [tables[fk.targetTableName]
                                    ? tables[fk.targetTableName]["uuid"]
                                    // Target table not yet created — use a deferred reference
                                    : text("uuid")],
                            })
                        );
                    }
                }

                for (const idx of tableIdxs) {
                    extras.push(index(idx.indexName).on(table[idx.colName]));
                }

                return extras;
            });
        }
    }

    return tables;
}

const allTables = buildDrizzleTables();

// Export each table as a named export — drizzle-kit expects this
Object.assign(module.exports, allTables);
