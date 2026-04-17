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
import {schemaNameToTableName, camelToSnake} from "./SqliteUtils";
import {EMBEDDED_SCHEMA_NAMES} from "./SchemaGenerator";
import General from "../../utility/General";

class SqliteProxy {
    /**
     * @param {Object} db - op-sqlite database instance
     * @param {Object} entityMappingConfig - EntityMappingConfig instance
     * @param {Map<string, TableMeta>} tableMetaMap - from SchemaGenerator.generateAll()
     * @param {Map<string, Object>} realmSchemaMap - original Realm schema map
     */
    constructor(db, entityMappingConfig, tableMetaMap, realmSchemaMap) {
        this.db = db;
        this.entityMappingConfig = entityMappingConfig;
        this.tableMetaMap = tableMetaMap;
        this.realmSchemaMap = realmSchemaMap;
        this.isSqlite = true;
        this._inTransaction = false;
        this.logQueries = false;
        this.slowQueryThreshold = 100; // ms

        // Bind executeQuery for passing to child objects
        this._executeQuery = this._executeQuery.bind(this);

        // Create hydrator
        this.hydrator = new EntityHydrator(
            tableMetaMap,
            realmSchemaMap,
            this._executeQuery,
            {} // referenceDataCache — populated after sync
        );

        // Query result cache — when active, caches hydrated entity arrays across
        // identical queries within a dashboard refresh cycle. Keyed by SQL+params+opts.
        this._queryCache = null;
    }

    /**
     * Enable query result caching. Identical queries (same SQL, params, hydration
     * options) within the same cache session return the same hydrated entities.
     * Call before a batch of rule evaluations (e.g., dashboard card loop).
     */
    beginQueryCache() {
        this._queryCache = new Map();
    }

    /**
     * Disable query result caching and release cached entities.
     */
    endQueryCache() {
        this._queryCache = null;
    }

    setLogQueries(value) {
        this.logQueries = value;
    }

    // ──── Core database operations ────

    _executeQuery(sql, params = []) {
        try {
            const start = Date.now();
            const result = this.db.executeSync(sql, params);
            const elapsed = Date.now() - start;
            const rows = result?.rows || [];
            if (elapsed > this.slowQueryThreshold) {
                General.logWarn("SqliteProxy", `Slow query (${elapsed}ms, ${rows.length} rows): ${sql.substring(0, 120)}`);
            }
            if (this.logQueries) {
                console.log(`SqliteProxy._executeQuery (${elapsed}ms): ${sql.substring(0, 80)}... → ${rows.length} rows`);
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

    static DEFAULT_REFERENCE_CACHE_CONFIGS = [
        {schemaName: 'Gender', depth: 1, skipLists: true},
        {schemaName: 'SubjectType', depth: 1, skipLists: true},
        {schemaName: 'Program', depth: 1, skipLists: true},
        {schemaName: 'EncounterType', depth: 1, skipLists: true},
        {schemaName: 'AddressLevel', depth: 1, skipLists: true},
    ];

    ensureReferenceCacheBuilt() {
        if (this._referenceCacheBuilt) return;
        const cache = this.hydrator.referenceDataCache;
        if (cache && Object.keys(cache).length > 0) {
            this._referenceCacheBuilt = true;
            return;
        }
        try {
            this.buildReferenceCache(SqliteProxy.DEFAULT_REFERENCE_CACHE_CONFIGS);
        } catch (e) {
            // Tables may not exist yet (before first sync)
            if (!e.message || !e.message.includes('no such table')) {
                General.logWarn("SqliteProxy", `Reference cache build failed: ${e.message}`);
            }
        }
        this._referenceCacheBuilt = true;
    }

    objects(schemaName) {
        this.ensureReferenceCacheBuilt();
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
            queryCache: this._queryCache,
        });
        resultsProxy.setLogQueries(this.logQueries);
        return resultsProxy;
    }

    // ──── SQL-native query API (available to all rules via params.db) ────
    // All methods prefixed with "exec" to distinguish from the Realm-compatible API.
    // Usage in rules: if (params.db.isSqlite) { params.db.execQuery(...) }

    /**
     * Execute a raw SQL SELECT query and return plain row objects.
     * No entity hydration — returns flat objects with snake_case column names.
     * Only SELECT statements are allowed (prevents mutations from eval'd rules).
     *
     * @param {string} sql - SQL SELECT statement with ? placeholders
     * @param {Array} params - parameter values for ? placeholders
     * @returns {Array<Object>} - array of plain row objects
     */
    execQuery(sql, params = []) {
        const trimmed = sql.trim();
        if (!/^SELECT\b/i.test(trimmed)) {
            throw new Error('SqliteProxy.execQuery: Only SELECT statements are allowed');
        }
        return this._executeQuery(sql, params);
    }

    /**
     * Execute a SQL COUNT query and return the count as a number.
     * Convenience wrapper around execQuery for the common count pattern.
     *
     * @param {string} sql - SQL SELECT COUNT(*) statement
     * @param {Array} params - parameter values
     * @returns {number}
     */
    execCount(sql, params = []) {
        const rows = this.execQuery(sql, params);
        if (!rows || rows.length === 0) return 0;
        const firstRow = rows[0];
        const keys = Object.keys(firstRow);
        return Number(firstRow[keys[0]]) || 0;
    }

    /**
     * Count entities in a schema with an optional SQL WHERE clause.
     * Translates schema name to table name automatically.
     *
     * @param {string} schemaName - Realm schema name (e.g., "Individual")
     * @param {string} whereSql - SQL WHERE clause fragment (without "WHERE"), or empty
     * @param {Array} params - parameter values for ? placeholders
     * @returns {number}
     */
    execCountEntities(schemaName, whereSql = '', params = []) {
        const tableMeta = this.tableMetaMap.get(schemaName);
        if (!tableMeta) {
            throw new Error(`SqliteProxy.execCountEntities: No table metadata for "${schemaName}"`);
        }
        const where = whereSql.trim() ? ` WHERE ${whereSql}` : '';
        const sql = `SELECT COUNT(*) AS cnt FROM ${tableMeta.tableName}${where}`;
        const rows = this._executeQuery(sql, params);
        return (rows && rows.length > 0) ? Number(rows[0].cnt) || 0 : 0;
    }

    /**
     * Look up an observation value from a JSON observations column.
     * Uses json_each() to search by concept UUID or name without hydration.
     *
     * @param {string} schemaName - Schema with observations column (e.g., "ProgramEnrolment")
     * @param {string} entityUuid - UUID of the entity row
     * @param {string} conceptNameOrUuid - concept name or UUID to find
     * @returns {*} parsed observation answer value, or null if not found
     */
    execFindObservationValue(schemaName, entityUuid, conceptNameOrUuid) {
        const tableMeta = this.tableMetaMap.get(schemaName);
        if (!tableMeta) {
            throw new Error(`SqliteProxy.execFindObservationValue: No table for "${schemaName}"`);
        }
        // Try as UUID first, then resolve name via concept table
        let conceptUuid = conceptNameOrUuid;
        const conceptRows = this._executeQuery(
            'SELECT "uuid" FROM concept WHERE "uuid" = ? OR "name" = ? LIMIT 1',
            [conceptNameOrUuid, conceptNameOrUuid]
        );
        if (conceptRows && conceptRows.length > 0) {
            conceptUuid = conceptRows[0].uuid;
        }
        const sql = `
            SELECT json_extract(obs.value, '$.valueJSON') AS value_json
            FROM ${tableMeta.tableName} AS t0,
                 json_each(t0."observations") AS obs
            WHERE t0."uuid" = ?
              AND json_extract(obs.value, '$.concept.uuid') = ?
            LIMIT 1
        `;
        const rows = this._executeQuery(sql, [entityUuid, conceptUuid]);
        if (!rows || rows.length === 0) return null;
        try {
            const parsed = JSON.parse(rows[0].value_json);
            return parsed.answer !== undefined ? parsed.answer : parsed;
        } catch (e) {
            return rows[0].value_json;
        }
    }

    /**
     * Execute a report card query: returns {primaryValue, lineListFunction}.
     * Count executes immediately via SQL. Line list is deferred — only hydrates
     * when the user taps the card.
     *
     * @param {string} countSql - SQL that returns a COUNT (e.g., "SELECT COUNT(*) FROM ...")
     * @param {Array} countParams - params for countSql
     * @param {string} listSql - SQL that returns uuid column (e.g., "SELECT i.uuid FROM ...")
     * @param {Array} listParams - params for listSql
     * @param {string} schemaName - Realm schema name for hydration (e.g., "Individual")
     * @returns {{primaryValue: number, lineListFunction: Function}}
     */
    execReport(countSql, countParams, listSql, listParams, schemaName) {
        const count = this.execCount(countSql, countParams);
        const self = this;
        return {
            primaryValue: count,
            lineListFunction: () => {
                const uuids = self.execQuery(listSql, listParams).map(r => {
                    const keys = Object.keys(r);
                    return r.uuid || r[keys[0]];
                });
                if (uuids.length === 0) return [];
                const CHUNK = 500;
                if (uuids.length <= CHUNK) {
                    const inClause = uuids.map(u => `"${u}"`).join(',');
                    return self.objects(schemaName)
                        .filtered(`uuid IN {${inClause}}`)
                        .withHydration({skipLists: true, depth: 1});
                }
                // For large result sets, chunk the IN clause to avoid SQLite limits
                let results = [];
                for (let i = 0; i < uuids.length; i += CHUNK) {
                    const chunk = uuids.slice(i, i + CHUNK);
                    const inClause = chunk.map(u => `"${u}"`).join(',');
                    const batch = self.objects(schemaName)
                        .filtered(`uuid IN {${inClause}}`)
                        .withHydration({skipLists: true, depth: 1});
                    results.push(...batch);
                }
                return results;
            }
        };
    }

    // ──── Entity CRUD operations ────

    /**
     * Create or update an entity in the database.
     *
     * @param {string} schemaName
     * @param {Object} object - entity or plain object
     * @param {string|boolean} updateMode - "never", "modified", "all", true, false, or Realm.UpdateMode enum
     * @param {Object} [options] - additional options
     * @param {boolean} [options.skipHydration=false] - skip post-INSERT re-read and hydration (use during bulk sync when return value is discarded)
     * @returns entity wrapped in entityClass
     */
    create(schemaName, object, updateMode = "never", options = {}) {
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
            if (updateCols.length === 0) {
                // Partial object with only PK — nothing to update, use INSERT OR IGNORE
                sql = `INSERT OR IGNORE INTO ${tableMeta.tableName} (${colList}) VALUES (${placeholders})`;
            } else {
                sql = `INSERT INTO ${tableMeta.tableName} (${colList}) VALUES (${placeholders})` +
                    ` ON CONFLICT("${pk}") DO UPDATE SET ${updateCols}`;
            }
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
        if (options.skipHydration) {
            return new entityClass(rawObject);
        }

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
            const hydrated = this.hydrator.hydrate(type, rows[0], this.hydrator.getDefaultHydrationOptions());
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

    // ──── Bulk operations for sync optimization ────

    /**
     * Build a reusable UPSERT SQL template for a schema. Same SQL for all entities.
     * @returns {{ sql: string, columnNames: string[] }}
     */
    _buildUpsertTemplate(schemaName) {
        const tableMeta = this.tableMetaMap.get(schemaName);
        if (!tableMeta) throw new Error(`No table metadata for schema "${schemaName}"`);

        const columnNames = tableMeta.getColumnNames();
        const colList = columnNames.map(c => `"${c}"`).join(", ");
        const placeholders = columnNames.map(() => "?").join(", ");
        const pk = tableMeta.primaryKey || "uuid";
        const updateCols = columnNames
            .filter(c => c !== pk)
            .map(c => `"${c}" = COALESCE(excluded."${c}", "${c}")`)
            .join(", ");

        const sql = `INSERT INTO ${tableMeta.tableName} (${colList}) VALUES (${placeholders})` +
            ` ON CONFLICT("${pk}") DO UPDATE SET ${updateCols}`;

        return {sql, columnNames};
    }

    /**
     * Extract ordered param array from a flat row matching the template's column order.
     */
    _extractParams(flatRow, columnNames) {
        return columnNames.map(col => flatRow.hasOwnProperty(col) ? flatRow[col] : null);
    }

    /**
     * Batch create/upsert entities using op-sqlite's executeBatch — ONE native call
     * for all entities instead of one per entity.
     *
     * @param {string} schemaName
     * @param {Array} entities - plain entity objects
     * @returns {Promise}
     */
    async bulkCreate(schemaName, entities) {
        if (!entities || entities.length === 0) return;

        const {sql, columnNames} = this._buildUpsertTemplate(schemaName);

        const commands = entities.map(entity => {
            const rawObject = (entity && entity.that) ? entity.that : entity;
            const flatRow = this.hydrator.flatten(schemaName, {that: rawObject});
            return [sql, this._extractParams(flatRow, columnNames)];
        });

        const start = Date.now();
        await this.db.executeBatch(commands);
        const elapsed = Date.now() - start;

        if (elapsed > this.slowQueryThreshold) {
            General.logWarn("SqliteProxy", `bulkCreate ${schemaName}: ${entities.length} entities in ${elapsed}ms (${Math.round(elapsed / entities.length * 10) / 10}ms/entity)`);
        }
    }

    // ──── Reference data cache ────

    /**
     * Populate reference data cache for fast FK resolution.
     * Call this after sync completes.
     *
     * @param {Array} cacheConfigs - array of {schemaName, depth, skipLists} objects.
     *   Order matters: cache dependencies first (e.g., Concept before Form).
     */
    buildReferenceCache(cacheConfigs) {
        this.hydrator.buildReferenceCache(cacheConfigs);
    }

    /**
     * Clear all reference data caches.
     */
    clearReferenceCache() {
        this.hydrator.referenceDataCache = {};
    }

    /**
     * Toggle shallow hydration for all queries on this connection. Used by
     * SyncService to bypass the deep batchPreload that would otherwise fire on
     * every findByKey("uuid", parentUuid) call from openchs-models'
     * fromResource. See EntityHydrator.setShallowMode for details.
     */
    setShallowMode(enabled) {
        this.hydrator.setShallowMode(enabled);
    }

    /**
     * Look up an entity by uuid from the in-memory reference data cache.
     * Returns the cached hydrated entity, or undefined if the schema has no
     * cache or the uuid isn't cached. Used by BaseService.findByKey to avoid
     * DB round-trips for reference entities (Concept, EncounterType, etc.)
     * during sync's fromResource calls (~15K concept lookups per 1000-entity page).
     */
    getCachedEntity(schemaName, uuid) {
        const cache = this.hydrator.referenceDataCache[schemaName];
        if (!cache) return undefined;
        const hydrated = cache.get(uuid);
        if (hydrated === undefined) return undefined;
        // Wrap in entity class — the cache stores plain hydrated objects from
        // buildReferenceCache, but callers expect class instances with methods
        // (e.g., Concept.isQuestionGroup used by assignObsFields in fromResource).
        const entityClass = this.entityMappingConfig.getEntityClass(schemaName);
        return entityClass ? new entityClass(hydrated) : hydrated;
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
