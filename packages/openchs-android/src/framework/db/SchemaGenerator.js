/**
 * SchemaGenerator - Converts Realm schema definitions into SQL CREATE TABLE statements.
 *
 * Reads dynamic schemas from EntityMappingConfig and generates raw SQL DDL.
 * The generated schema metadata is also used by SqliteProxy and EntityHydrator
 * to understand table structure at runtime.
 */

import {camelToSnake, schemaNameToTableName, normalizeRealmType} from "./SqliteUtils";

const EMBEDDED_SCHEMA_NAMES = new Set([
    "Observation",
    "Point",
    "SubjectLocation",
    "KeyValue",
    "EmbeddedKeyValue",
    "Format",
    "EmbeddedFormat",
    "ChecklistItemStatus",
    "EmbeddedChecklistItemStatus",
    "StringKeyNumericValue",
    "EmbeddedStringKeyNumericValue",
    "ConceptMedia",
    "ReportCardResult",
    "NestedReportCardResult",
]);

class ColumnDef {
    constructor(name, sqlType, isPrimaryKey = false, isOptional = false, defaultValue = undefined, fkTable = null) {
        this.name = name;
        this.sqlType = sqlType;
        this.isPrimaryKey = isPrimaryKey;
        this.isOptional = isOptional;
        this.defaultValue = defaultValue;
        this.fkTable = fkTable;
    }
}

class TableMeta {
    constructor(schemaName, tableName, columns, listProperties, embeddedProperties) {
        this.schemaName = schemaName;
        this.tableName = tableName;
        this.columns = columns;
        this.listProperties = listProperties;
        this.embeddedProperties = embeddedProperties;
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

class SchemaGenerator {
    static generateAll(entityMappingConfig) {
        const schemas = entityMappingConfig.getRealmConfig().schema;
        const schemaMap = new Map();

        const schemaPKMap = new Map();
        schemas.forEach(schema => {
            schemaPKMap.set(schema.name, !!schema.primaryKey);
        });

        schemas.forEach(schema => {
            if (EMBEDDED_SCHEMA_NAMES.has(schema.name)) {
                return;
            }
            const tableMeta = SchemaGenerator.generateTable(schema, schemaPKMap);
            schemaMap.set(schema.name, tableMeta);
        });

        return schemaMap;
    }

    static generateTable(schema, schemaPKMap) {
        const tableName = schemaNameToTableName(schema.name);
        const columns = [];
        const listProperties = {};
        const embeddedProperties = {};
        const properties = schema.properties || {};

        Object.keys(properties).forEach(propName => {
            const propDef = properties[propName];
            const parsed = SchemaGenerator.parseProperty(propName, propDef, schema.primaryKey, schemaPKMap);

            if (parsed.skip) {
                if (parsed.listTarget) {
                    listProperties[propName] = parsed.listTarget;
                }
                return;
            }

            if (parsed.embeddedType) {
                embeddedProperties[propName] = parsed.embeddedType;
            }

            columns.push(parsed.column);
        });

        return new TableMeta(schema.name, tableName, columns, listProperties, embeddedProperties);
    }

    static parseProperty(propName, propDef, primaryKeyName, schemaPKMap) {
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

        const type = propDef.type;
        const objectType = propDef.objectType;
        const isOptional = propDef.optional === true;
        const defaultVal = propDef.default;

        if (type === "object") {
            if (EMBEDDED_SCHEMA_NAMES.has(objectType)) {
                return {
                    skip: false,
                    embeddedType: objectType,
                    column: new ColumnDef(camelToSnake(propName), "TEXT", false, isOptional, defaultVal != null ? JSON.stringify(defaultVal) : undefined),
                };
            }
            const fkColName = `${camelToSnake(propName)}_uuid`;
            const fkTableName = schemaNameToTableName(objectType);
            return {
                skip: false,
                column: new ColumnDef(fkColName, "TEXT", false, isOptional, undefined, fkTableName),
            };
        }

        if (type === "list") {
            if (EMBEDDED_SCHEMA_NAMES.has(objectType)) {
                return {
                    skip: false,
                    embeddedType: objectType,
                    column: new ColumnDef(camelToSnake(propName), "TEXT", false, true, "[]"),
                };
            }
            return {
                skip: true,
                listTarget: objectType,
            };
        }

        const sqlType = realmTypeToSql(type);
        const isPK = propName === primaryKeyName;
        return {
            skip: false,
            column: new ColumnDef(camelToSnake(propName), sqlType, isPK, isOptional, defaultVal),
        };
    }

    static generateCreateTableStatements(schemaMap) {
        const statements = [];

        schemaMap.forEach((tableMeta) => {
            const colDefs = tableMeta.columns.map(col => {
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

            const fkConstraints = tableMeta.columns
                .filter(col => col.fkTable)
                .map(col => `FOREIGN KEY ("${col.name}") REFERENCES ${col.fkTable}("uuid")`);

            const allDefs = [...colDefs, ...fkConstraints];
            const sql = `CREATE TABLE IF NOT EXISTS ${tableMeta.tableName} (\n  ${allDefs.join(",\n  ")}\n)`;
            statements.push(sql);
        });

        return statements;
    }

    static generateIndexStatements(schemaMap) {
        const statements = [];

        schemaMap.forEach((tableMeta) => {
            tableMeta.columns
                .filter(col => col.fkTable)
                .forEach(col => {
                    const indexName = `idx_${tableMeta.tableName}_${col.name}`;
                    statements.push(`CREATE INDEX IF NOT EXISTS ${indexName} ON ${tableMeta.tableName}("${col.name}")`);
                });

            if (tableMeta.getColumn("voided")) {
                const indexName = `idx_${tableMeta.tableName}_voided`;
                statements.push(`CREATE INDEX IF NOT EXISTS ${indexName} ON ${tableMeta.tableName}("voided")`);
            }

            if (tableMeta.schemaName === "EntitySyncStatus" && tableMeta.getColumn("entity_name")) {
                statements.push(`CREATE INDEX IF NOT EXISTS idx_entity_sync_status_entity_name ON entity_sync_status("entity_name")`);
            }
        });

        return statements;
    }

    static buildRealmSchemaMap(entityMappingConfig) {
        const map = new Map();
        const schemas = entityMappingConfig.getRealmConfig().schema;
        schemas.forEach(schema => {
            map.set(schema.name, schema);
        });
        return map;
    }
}

function realmTypeToSql(realmType) {
    switch (realmType) {
        case "string":
            return "TEXT";
        case "bool":
            return "INTEGER";
        case "int":
            return "INTEGER";
        case "float":
        case "double":
            return "REAL";
        case "date":
            return "INTEGER";
        case "decimal128":
            return "TEXT";
        case "data":
            return "BLOB";
        default:
            return "TEXT";
    }
}

export {SchemaGenerator, TableMeta, ColumnDef, EMBEDDED_SCHEMA_NAMES, realmTypeToSql};
export default SchemaGenerator;
