/**
 * DrizzleSchemaGenerator - Converts Realm schema definitions into SQL CREATE TABLE statements.
 *
 * Since Drizzle ORM's `sqliteTable()` requires static/compile-time definitions,
 * and our schemas are dynamic (from EntityMappingConfig), we generate raw SQL DDL
 * and use op-sqlite's `execute()` directly for table creation.
 *
 * The generated schema metadata is also used by SqliteProxy and EntityHydrator
 * to understand table structure at runtime.
 */

import _ from "lodash";
import {camelToSnake, schemaNameToTableName, normalizeRealmType} from "./RealmQueryParser";

// Entity schemas that are embedded (no primary key, stored as JSON on parent)
const EMBEDDED_SCHEMA_NAMES = new Set([
    "Observation",
    "Point",
    "SubjectLocation",
    "KeyValue",
    "EmbeddedKeyValue",
    "Format",
    "EmbeddedFormat",
    "ChecklistItemStatus",
    "StringKeyNumericValue",
    "ConceptMedia",
]);

// Properties that are list-type relationships pointing to entities with PKs.
// These are not stored as columns on the parent table — the FK lives on the child.
// We track them for hydration but skip in DDL.
const AUDIT_FIELDS = {
    createdBy: {type: "string", optional: true},
    lastModifiedBy: {type: "string", optional: true},
    createdByUUID: {type: "string", optional: true},
    lastModifiedByUUID: {type: "string", optional: true},
};

/**
 * Represents a parsed column definition for a SQLite table.
 */
class ColumnDef {
    constructor(name, sqlType, isPrimaryKey = false, isOptional = false, defaultValue = undefined, fkTable = null) {
        this.name = name;
        this.sqlType = sqlType;
        this.isPrimaryKey = isPrimaryKey;
        this.isOptional = isOptional;
        this.defaultValue = defaultValue;
        this.fkTable = fkTable; // if non-null, this is a FK column referencing fkTable.uuid
    }
}

/**
 * Represents metadata for a table derived from a Realm schema.
 */
class TableMeta {
    constructor(schemaName, tableName, columns, listProperties, embeddedProperties) {
        this.schemaName = schemaName;       // Realm schema name (e.g., "Individual")
        this.tableName = tableName;         // SQL table name (e.g., "individual")
        this.columns = columns;             // Array<ColumnDef>
        this.listProperties = listProperties;   // { propName: targetSchemaName } — referenced lists (FK on child)
        this.embeddedProperties = embeddedProperties; // { propName: schemaName } — embedded as JSON
        this.primaryKey = columns.find(c => c.isPrimaryKey)?.name || null;
    }

    getColumnNames() {
        return this.columns.map(c => c.name);
    }

    getColumn(name) {
        return this.columns.find(c => c.name === name);
    }

    getForeignKeyColumns() {
        return this.columns.filter(c => c.fkTable != null);
    }
}

class DrizzleSchemaGenerator {
    /**
     * Generate table metadata for all entities in the EntityMappingConfig.
     *
     * @param {Object} entityMappingConfig - EntityMappingConfig.getInstance()
     * @returns {Map<string, TableMeta>} - Map from schemaName to TableMeta
     */
    static generateAll(entityMappingConfig) {
        const schemas = entityMappingConfig.getRealmConfig().schema;
        const schemaMap = new Map();

        // First pass: identify all schemas and their primaryKey status
        const schemaPKMap = new Map();
        schemas.forEach(schema => {
            schemaPKMap.set(schema.name, !!schema.primaryKey);
        });

        // Second pass: generate table metadata for non-embedded schemas
        schemas.forEach(schema => {
            if (EMBEDDED_SCHEMA_NAMES.has(schema.name)) {
                return; // skip embedded schemas — they're stored as JSON
            }
            const tableMeta = DrizzleSchemaGenerator.generateTable(schema, schemaPKMap);
            schemaMap.set(schema.name, tableMeta);
        });

        return schemaMap;
    }

    /**
     * Generate TableMeta for a single Realm schema.
     */
    static generateTable(schema, schemaPKMap) {
        const tableName = schemaNameToTableName(schema.name);
        const columns = [];
        const listProperties = {};
        const embeddedProperties = {};
        const properties = schema.properties || {};

        Object.keys(properties).forEach(propName => {
            const propDef = properties[propName];
            const parsed = DrizzleSchemaGenerator.parseProperty(propName, propDef, schema.primaryKey, schemaPKMap);

            if (parsed.skip) {
                if (parsed.listTarget) {
                    listProperties[propName] = parsed.listTarget;
                }
                if (parsed.embeddedTarget) {
                    embeddedProperties[propName] = parsed.embeddedTarget;
                }
                return;
            }

            columns.push(parsed.column);
        });

        return new TableMeta(schema.name, tableName, columns, listProperties, embeddedProperties);
    }

    /**
     * Parse a single Realm property definition into a ColumnDef or skip indicator.
     */
    static parseProperty(propName, propDef, primaryKeyName, schemaPKMap) {
        // Shorthand string form: "string", "bool", "int", "double", "float", "date", "decimal128"
        // May include "?" suffix for optional (e.g., "date?", "string?")
        if (typeof propDef === "string") {
            const isOptional = propDef.endsWith("?");
            const normalizedType = normalizeRealmType(propDef);
            const sqlType = realmTypeToSql(normalizedType);
            const isPK = propName === primaryKeyName;
            return {
                skip: false,
                column: new ColumnDef(camelToSnake(propName), sqlType, isPK, isOptional),
            };
        }

        // Object form: { type, objectType, optional, default }
        const type = propDef.type;
        const objectType = propDef.objectType;
        const isOptional = propDef.optional === true;
        const defaultVal = propDef.default;

        // Object reference to another entity
        if (type === "object") {
            if (EMBEDDED_SCHEMA_NAMES.has(objectType)) {
                // Embedded object → store as JSON text column
                return {
                    skip: false,
                    column: new ColumnDef(camelToSnake(propName), "TEXT", false, isOptional, defaultVal != null ? JSON.stringify(defaultVal) : undefined),
                };
            }
            // Referenced entity → FK column (entity_uuid)
            const fkColName = `${camelToSnake(propName)}_uuid`;
            const fkTableName = schemaNameToTableName(objectType);
            return {
                skip: false,
                column: new ColumnDef(fkColName, "TEXT", false, isOptional, undefined, fkTableName),
            };
        }

        // List type
        if (type === "list") {
            if (EMBEDDED_SCHEMA_NAMES.has(objectType)) {
                // List of embedded objects → JSON text column on parent
                return {
                    skip: false,
                    column: new ColumnDef(camelToSnake(propName), "TEXT", false, true, "[]"),
                };
            }
            // List of referenced entities → FK lives on child table, skip this column
            return {
                skip: true,
                listTarget: objectType,
            };
        }

        // Scalar types with options
        const sqlType = realmTypeToSql(type);
        const isPK = propName === primaryKeyName;
        return {
            skip: false,
            column: new ColumnDef(camelToSnake(propName), sqlType, isPK, isOptional, defaultVal),
        };
    }

    /**
     * Generate SQL CREATE TABLE statements for all tables.
     *
     * @param {Map<string, TableMeta>} schemaMap
     * @returns {Array<string>} - Array of CREATE TABLE SQL statements
     */
    static generateCreateTableStatements(schemaMap) {
        const statements = [];

        schemaMap.forEach((tableMeta, schemaName) => {
            const colDefs = tableMeta.columns.map(col => {
                // Quote column names to avoid conflicts with SQL reserved words (e.g., "unique", "order", "group")
                let def = `"${col.name}" ${col.sqlType}`;
                if (col.isPrimaryKey) {
                    def += " PRIMARY KEY";
                }
                if (col.defaultValue !== undefined) {
                    if (typeof col.defaultValue === "string") {
                        def += ` DEFAULT '${col.defaultValue.replace(/'/g, "''")}'`;
                    } else if (typeof col.defaultValue === "boolean") {
                        def += ` DEFAULT ${col.defaultValue ? 1 : 0}`;
                    } else {
                        def += ` DEFAULT ${col.defaultValue}`;
                    }
                }
                return def;
            });

            // Add FK constraints
            const fkConstraints = tableMeta.columns
                .filter(col => col.fkTable)
                .map(col => `FOREIGN KEY ("${col.name}") REFERENCES ${col.fkTable}("uuid")`);

            const allDefs = [...colDefs, ...fkConstraints];
            const sql = `CREATE TABLE IF NOT EXISTS ${tableMeta.tableName} (\n  ${allDefs.join(",\n  ")}\n)`;
            statements.push(sql);
        });

        return statements;
    }

    /**
     * Generate CREATE INDEX statements for common query patterns.
     */
    static generateIndexStatements(schemaMap) {
        const statements = [];

        schemaMap.forEach((tableMeta) => {
            // Index all FK columns
            tableMeta.columns
                .filter(col => col.fkTable)
                .forEach(col => {
                    const indexName = `idx_${tableMeta.tableName}_${col.name}`;
                    statements.push(`CREATE INDEX IF NOT EXISTS ${indexName} ON ${tableMeta.tableName}("${col.name}")`);
                });

            // Index 'voided' column if it exists (very common filter)
            if (tableMeta.getColumn("voided")) {
                const indexName = `idx_${tableMeta.tableName}_voided`;
                statements.push(`CREATE INDEX IF NOT EXISTS ${indexName} ON ${tableMeta.tableName}("voided")`);
            }

            // Index 'entity_name' on entity_sync_status (common filter)
            if (tableMeta.schemaName === "EntitySyncStatus" && tableMeta.getColumn("entity_name")) {
                statements.push(`CREATE INDEX IF NOT EXISTS idx_entity_sync_status_entity_name ON entity_sync_status("entity_name")`);
            }
        });

        return statements;
    }

    /**
     * Build a schema map (Map<schemaName, schema>) from EntityMappingConfig
     * for use by RealmQueryParser's dot-notation resolution.
     */
    static buildRealmSchemaMap(entityMappingConfig) {
        const map = new Map();
        const schemas = entityMappingConfig.getRealmConfig().schema;
        schemas.forEach(schema => {
            map.set(schema.name, schema);
        });
        return map;
    }
}

/**
 * Convert Realm type string to SQLite type string.
 */
function realmTypeToSql(realmType) {
    switch (realmType) {
        case "string":
            return "TEXT";
        case "bool":
            return "INTEGER"; // 0/1
        case "int":
            return "INTEGER";
        case "float":
        case "double":
            return "REAL";
        case "date":
            return "INTEGER"; // epoch milliseconds
        case "decimal128":
            return "TEXT"; // preserve precision
        case "data":
            return "BLOB";
        default:
            return "TEXT"; // fallback
    }
}

export {DrizzleSchemaGenerator, TableMeta, ColumnDef, EMBEDDED_SCHEMA_NAMES};
export default DrizzleSchemaGenerator;
