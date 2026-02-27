/**
 * SqliteProxy - Drop-in replacement for RealmProxy.
 *
 * Implements the same contract:
 *   - objects(schemaName) → SqliteResultsProxy
 *   - create(schemaName, object, updateMode) → entity
 *   - write(callback) → transaction wrapper
 *   - delete(objectOrObjects)
 *   - objectForPrimaryKey(type, key) → entity
 *   - isInTransaction, close(), schemaVersion, path, schema
 */

import _ from "lodash";
import SqliteResultsProxy from "./SqliteResultsProxy";
import EntityHydrator from "./EntityHydrator";
import {schemaNameToTableName, camelToSnake} from "./RealmQueryParser";
import {EMBEDDED_SCHEMA_NAMES} from "./DrizzleSchemaGenerator";

class SqliteProxy {
    /**
     * @param {Object} db - op-sqlite database instance
     * @param {Object} entityMappingConfig - EntityMappingConfig instance
     * @param {Map<string, TableMeta>} tableMetaMap - from DrizzleSchemaGenerator.generateAll()
     * @param {Map<string, Object>} realmSchemaMap - original Realm schema map
     */
    constructor(db, entityMappingConfig, tableMetaMap, realmSchemaMap) {
        this.db = db;
        this.entityMappingConfig = entityMappingConfig;
        this.tableMetaMap = tableMetaMap;
        this.realmSchemaMap = realmSchemaMap;
        this._inTransaction = false;
        this.logQueries = false;

        // Bind executeQuery for passing to child objects
        this._executeQuery = this._executeQuery.bind(this);

        // Create hydrator
        this.hydrator = new EntityHydrator(
            tableMetaMap,
            realmSchemaMap,
            this._executeQuery,
            {} // referenceDataCache — populated after sync
        );
    }

    setLogQueries(value) {
        this.logQueries = value;
    }

    // ──── Core database operations ────

    _executeQuery(sql, params = []) {
        try {
            const result = this.db.executeSync(sql, params);
            const rows = result?.rows || [];
            if (this.logQueries) {
                console.log(`SqliteProxy._executeQuery: ${sql.substring(0, 80)}... → ${rows.length} rows`);
            }
            return rows;
        } catch (e) {
            console.error("SqliteProxy._executeQuery error:", sql, params, e);
            throw e;
        }
    }

    _executeRaw(sql, params = []) {
        try {
            return this.db.executeSync(sql, params);
        } catch (e) {
            console.error("SqliteProxy._executeRaw error:", sql, params, e);
            throw e;
        }
    }

    // ──── RealmProxy contract ────

    objects(schemaName) {
        const entityClass = this.entityMappingConfig.getEntityClass(schemaName);
        const tableMeta = this.tableMetaMap.get(schemaName);

        if (!tableMeta) {
            if (EMBEDDED_SCHEMA_NAMES.has(schemaName)) {
                // Embedded schemas (Observation, Point, etc.) are stored as JSON on parent tables,
                // not as separate tables. Return an empty results proxy.
                return SqliteResultsProxy.create({
                    schemaName,
                    tableName: schemaNameToTableName(schemaName),
                    entityClass,
                    executeQuery: () => [],
                    hydrator: this.hydrator,
                    realmSchemaMap: this.realmSchemaMap,
                });
            }
            throw new Error(`SqliteProxy.objects: No table metadata found for schema "${schemaName}"`);
        }

        const resultsProxy = SqliteResultsProxy.create({
            schemaName,
            tableName: tableMeta.tableName,
            entityClass,
            executeQuery: this._executeQuery,
            hydrator: this.hydrator,
            realmSchemaMap: this.realmSchemaMap,
        });
        resultsProxy.setLogQueries(this.logQueries);
        return resultsProxy;
    }

    /**
     * Create or update an entity in the database.
     *
     * @param {string} schemaName
     * @param {Object} object - entity or plain object
     * @param {string|boolean} updateMode - "never", "modified", "all", true, false, or Realm.UpdateMode enum
     * @returns entity wrapped in entityClass
     */
    create(schemaName, object, updateMode = "never") {
        const entityClass = this.entityMappingConfig.getEntityClass(schemaName);
        const tableMeta = this.tableMetaMap.get(schemaName);

        if (!tableMeta) {
            throw new Error(`SqliteProxy.create: No table metadata found for schema "${schemaName}"`);
        }

        // Unwrap entity if it's a PersistedObject
        const rawObject = (object && object.that) ? object.that : object;

        // Validate mandatory properties (same as RealmProxy)
        const mandatoryProps = this.entityMappingConfig.getMandatoryObjectSchemaProperties(schemaName);
        const saveKeys = Object.keys(rawObject);
        const shouldValidate = updateMode === "never" || updateMode === false ||
            _.intersection(mandatoryProps, saveKeys).length > 0;

        if (shouldValidate) {
            const emptyMandatory = saveKeys.filter(key =>
                _.isNil(rawObject[key]) && mandatoryProps.includes(key)
            );
            if (emptyMandatory.length > 0) {
                throw new Error(
                    `${emptyMandatory.join(",")} are mandatory for ${schemaName}, ` +
                    `Keys being saved - ${saveKeys.join(",")}. UUID: ${rawObject.uuid}`
                );
            }
        }

        // Flatten the entity for SQL storage
        const flatRow = this.hydrator.flatten(schemaName, {that: rawObject});

        // Determine SQL operation based on updateMode
        const shouldUpsert = updateMode === true || updateMode === "modified" || updateMode === "all";

        // Build column lists (only include columns that are in the flatRow AND in the table schema)
        const validColumns = tableMeta.getColumnNames();
        const columnsToInsert = [];
        const valuesToInsert = [];

        validColumns.forEach(colName => {
            if (flatRow.hasOwnProperty(colName)) {
                columnsToInsert.push(colName);
                valuesToInsert.push(flatRow[colName]);
            }
        });

        if (columnsToInsert.length === 0) {
            throw new Error(`SqliteProxy.create: No valid columns to insert for ${schemaName}`);
        }

        const placeholders = columnsToInsert.map(() => "?").join(", ");
        const colList = columnsToInsert.map(c => `"${c}"`).join(", ");

        // For tables without a primary key (e.g., EntityQueue), Realm kept one row
        // per logical key (entityUUID). Replicate this by deleting the existing row
        // before inserting the new one.
        if (!tableMeta.primaryKey && flatRow.entity_uuid) {
            this._executeRaw(
                `DELETE FROM ${tableMeta.tableName} WHERE "entity_uuid" = ?`,
                [flatRow.entity_uuid]
            );
        }

        let sql;
        if (shouldUpsert) {
            // Use INSERT ... ON CONFLICT DO UPDATE with COALESCE to match
            // Realm's UpdateMode.Modified: null values in the new data should
            // NOT overwrite existing non-null values in the database.
            const pk = tableMeta.primaryKey || "uuid";
            const updateCols = columnsToInsert
                .filter(c => c !== pk)
                .map(c => `"${c}" = COALESCE(excluded."${c}", "${c}")`)
                .join(", ");
            sql = `INSERT INTO ${tableMeta.tableName} (${colList}) VALUES (${placeholders})` +
                ` ON CONFLICT("${pk}") DO UPDATE SET ${updateCols}`;
        } else {
            // INSERT for strict create (will fail on duplicate PK)
            sql = `INSERT INTO ${tableMeta.tableName} (${colList}) VALUES (${placeholders})`;
        }

        try {
            this._executeRaw(sql, valuesToInsert);
        } catch (e) {
            if (e.message && e.message.includes("FOREIGN KEY constraint failed")) {
                // Diagnose which FK is missing
                const fkColumns = tableMeta.getForeignKeyColumns();
                const missingFKs = [];
                fkColumns.forEach(col => {
                    const idx = columnsToInsert.indexOf(col.name);
                    const fkValue = idx >= 0 ? valuesToInsert[idx] : null;
                    if (fkValue != null) {
                        const refRows = this._executeQuery(
                            `SELECT "uuid" FROM ${col.fkTable} WHERE "uuid" = ?`, [fkValue]
                        );
                        if (!refRows || refRows.length === 0) {
                            missingFKs.push(`${col.name}=${fkValue} → ${col.fkTable} (NOT FOUND)`);
                        }
                    }
                });
                console.error(
                    `SqliteProxy.create FK error for ${schemaName} (uuid=${rawObject.uuid}):`,
                    missingFKs.length > 0 ? missingFKs.join("; ") : "all FKs exist — may be INSERT OR REPLACE cascade issue",
                    `\nAll FK values: ${fkColumns.map(col => {
                        const idx = columnsToInsert.indexOf(col.name);
                        return `${col.name}=${idx >= 0 ? valuesToInsert[idx] : 'N/A'} → ${col.fkTable}`;
                    }).join("; ")}`
                );
            }
            throw e;
        }

        // Return entity wrapped in entity class
        // Re-read from DB to get the canonical stored form
        if (tableMeta.primaryKey && rawObject.uuid) {
            const rows = this._executeQuery(
                `SELECT * FROM ${tableMeta.tableName} WHERE "${tableMeta.primaryKey}" = ?`,
                [rawObject.uuid]
            );
            if (rows.length > 0) {
                const hydrated = this.hydrator.hydrate(schemaName, rows[0], {skipLists: true, depth: 1});
                return new entityClass(hydrated);
            }
        }

        return new entityClass(rawObject);
    }

    delete(objectOrObjects) {
        if (_.isNil(objectOrObjects)) return;

        const deleteOne = (obj) => {
            // Determine what we're deleting
            const data = obj.that || obj;

            // Find the schema name from the entity class or constructor
            const schemaName = this._findSchemaName(obj);
            if (!schemaName) {
                console.warn("SqliteProxy.delete: Could not determine schema for object", data);
                return;
            }

            const tableMeta = this.tableMetaMap.get(schemaName);
            if (!tableMeta) return;

            if (tableMeta.primaryKey && data[tableMeta.primaryKey]) {
                // Table has a primary key (e.g., uuid) — delete by PK
                this._executeRaw(
                    `DELETE FROM ${tableMeta.tableName} WHERE "${tableMeta.primaryKey}" = ?`,
                    [data[tableMeta.primaryKey]]
                );
            } else if (data.uuid) {
                // Fallback: try uuid even if not declared as PK
                this._executeRaw(
                    `DELETE FROM ${tableMeta.tableName} WHERE "uuid" = ?`,
                    [data.uuid]
                );
            } else {
                // No PK (e.g., EntityQueue) — delete by matching all column values
                const realmSchema = this.realmSchemaMap.get(schemaName);
                if (!realmSchema || !realmSchema.properties) {
                    console.warn(`SqliteProxy.delete: No schema properties for ${schemaName}`, data);
                    return;
                }
                const whereParts = [];
                const params = [];
                Object.keys(realmSchema.properties).forEach(propName => {
                    const value = data[propName];
                    if (value !== undefined && value !== null) {
                        const colName = camelToSnake(propName);
                        whereParts.push(`"${colName}" = ?`);
                        params.push(value instanceof Date ? value.getTime() : value);
                    }
                });
                if (whereParts.length === 0) {
                    console.warn(`SqliteProxy.delete: No column values to match for ${schemaName}`, data);
                    return;
                }
                this._executeRaw(
                    `DELETE FROM ${tableMeta.tableName} WHERE ${whereParts.join(" AND ")}`,
                    params
                );
            }
        };

        if (Array.isArray(objectOrObjects)) {
            objectOrObjects.forEach(obj => deleteOne(obj));
        } else if (objectOrObjects && typeof objectOrObjects[Symbol.iterator] === "function") {
            // Iterable (like Realm Results)
            for (const obj of objectOrObjects) {
                deleteOne(obj);
            }
        } else {
            deleteOne(objectOrObjects);
        }
    }

    objectForPrimaryKey(type, key) {
        const entityClass = this.entityMappingConfig.getEntityClass(type);
        const tableMeta = this.tableMetaMap.get(type);

        if (!tableMeta) {
            throw new Error(`SqliteProxy.objectForPrimaryKey: No table for "${type}"`);
        }

        const rows = this._executeQuery(
            `SELECT * FROM ${tableMeta.tableName} WHERE "${tableMeta.primaryKey}" = ?`,
            [key]
        );

        if (!rows || rows.length === 0) return null;

        this.hydrator.beginHydrationSession();
        try {
            const hydrated = this.hydrator.hydrate(type, rows[0], {skipLists: false, depth: 3});
            return new entityClass(hydrated);
        } finally {
            this.hydrator.endHydrationSession();
        }
    }

    write(callback) {
        if (this._inTransaction) {
            // Already in a transaction — just run the callback
            return callback();
        }

        this._inTransaction = true;
        try {
            this._executeRaw("BEGIN TRANSACTION");
            const result = callback();
            this._executeRaw("COMMIT");
            return result;
        } catch (e) {
            try {
                this._executeRaw("ROLLBACK");
            } catch (rollbackError) {
                console.error("SqliteProxy.write: ROLLBACK failed", rollbackError);
            }
            throw e;
        } finally {
            this._inTransaction = false;
        }
    }

    writeCopyTo(config) {
        // For SQLite, we can copy the database file
        // This is a simplified implementation for the spike
        console.warn("SqliteProxy.writeCopyTo: Not yet implemented for SQLite");
    }

    // ──── Properties ────

    get isInTransaction() {
        return this._inTransaction;
    }

    get path() {
        return this.db.getDbPath ? this.db.getDbPath() : "sqlite-db";
    }

    get schema() {
        return this.entityMappingConfig.getRealmConfig().schema;
    }

    get schemaVersion() {
        return this.entityMappingConfig.getSchemaVersion();
    }

    close() {
        if (this.db.close) {
            this.db.close();
        }
    }

    // ──── Reference data cache ────

    /**
     * Populate reference data cache for fast FK resolution.
     * Call this after sync completes.
     */
    buildReferenceCache(referenceSchemaNames) {
        this.hydrator.buildReferenceCache(referenceSchemaNames);
    }

    /**
     * Clear all reference data caches.
     */
    clearReferenceCache() {
        this.hydrator.referenceDataCache = {};
    }

    // ──── Internal helpers ────

    _findSchemaName(obj) {
        // Try to get schema name from entity class
        if (obj.constructor && obj.constructor.schema && obj.constructor.schema.name) {
            return obj.constructor.schema.name;
        }

        // Try to find by iterating known schemas
        const data = obj.that || obj;
        if (data._schemaName) return data._schemaName;

        // If we have the entity class map, try to find a match
        for (const [schemaName, entityClass] of this.entityMappingConfig.schemaEntityMap) {
            if (obj instanceof entityClass) {
                return schemaName;
            }
        }

        return null;
    }
}

export default SqliteProxy;
