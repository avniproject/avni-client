/**
 * EntityHydrator - Converts flat SQL rows into nested objects matching the
 * `this.that` shape expected by PersistedObject/entity classes.
 *
 * Responsibilities:
 * 1. Resolve FK columns (e.g., subject_type_uuid) → full nested objects
 * 2. Parse JSON columns (observations, embedded objects) → objects
 * 3. Attach list properties by querying child tables
 * 4. Convert SQLite types back to JS types (epoch ms → Date, 0/1 → bool)
 */

import _ from "lodash";
import {EMBEDDED_SCHEMA_NAMES} from "./DrizzleSchemaGenerator";
import {camelToSnake, schemaNameToTableName, normalizeRealmType} from "./RealmQueryParser";

class EntityHydrator {
    /**
     * @param {Map<string, TableMeta>} tableMetaMap - schema metadata
     * @param {Map<string, Object>} realmSchemaMap - original Realm schema definitions
     * @param {Function} executeQuery - function(sql, params) => rows[]
     * @param {Object} referenceDataCache - { schemaName: Map<uuid, hydratedObject> }
     */
    constructor(tableMetaMap, realmSchemaMap, executeQuery, referenceDataCache = {}) {
        this.tableMetaMap = tableMetaMap;
        this.realmSchemaMap = realmSchemaMap;
        this.executeQuery = executeQuery;
        this.referenceDataCache = referenceDataCache;

        // Session-scoped hydration cache: avoids re-hydrating the same entity at a
        // shallower depth within a single hydration batch. Handles back-references:
        // Individual (depth 2) → enrolments → ProgramEnrolment.individual back-ref
        // returns the already-hydrated Individual instead of a depth-0 shallow copy.
        // Created/destroyed per session via beginHydrationSession/endHydrationSession.
        this._hydrationCache = null;
    }

    /**
     * Hydrate a flat SQL row into a nested object matching the entity shape.
     *
     * @param {string} schemaName - Realm schema name (e.g., "Individual")
     * @param {Object} row - flat SQL row object
     * @param {Object} options - { skipLists: false, depth: 2 }
     * @returns {Object} - nested object suitable for `new EntityClass(hydratedObj)`
     */
    hydrate(schemaName, row, options = {}) {
        if (_.isNil(row)) return null;

        const realmSchema = this.realmSchemaMap.get(schemaName);
        if (!realmSchema) return row;

        const depth = options.depth != null ? options.depth : 2;
        const skipLists = options.skipLists || false;

        const result = {};

        // Pre-register in session cache so back-references during this hydration
        // find the in-progress result object (prevents depth-0 shallow copies).
        const rowUuid = row.uuid || row.UUID;
        if (this._hydrationCache && depth >= 1 && rowUuid) {
            const cacheKey = `${schemaName}:${rowUuid}`;
            if (!this._hydrationCache.has(cacheKey)) {
                this._hydrationCache.set(cacheKey, result);
            }
        }

        const properties = realmSchema.properties || {};

        Object.keys(properties).forEach(propName => {
            const propDef = properties[propName];
            const resolvedType = normalizeRealmType(typeof propDef === "string" ? propDef : propDef.type);
            const objectType = typeof propDef === "object" ? propDef.objectType : null;
            const snakeName = camelToSnake(propName);

            if (resolvedType === "object" && objectType) {
                if (EMBEDDED_SCHEMA_NAMES.has(objectType)) {
                    // Embedded object stored as JSON
                    const jsonVal = row[snakeName];
                    result[propName] = parseJsonSafe(jsonVal);
                } else {
                    // Referenced entity — FK column is propName_uuid
                    const fkColName = `${snakeName}_uuid`;
                    const fkValue = row[fkColName];
                    if (_.isNil(fkValue) || depth <= 0) {
                        result[propName] = null;
                    } else {
                        result[propName] = this.resolveReference(objectType, fkValue, depth - 1);
                    }
                }
            } else if (resolvedType === "list" && objectType) {
                if (EMBEDDED_SCHEMA_NAMES.has(objectType)) {
                    // Embedded list stored as JSON
                    const jsonVal = row[snakeName];
                    result[propName] = parseJsonSafe(jsonVal) || [];
                } else if (!skipLists && depth > 0) {
                    // Referenced list — query child table
                    result[propName] = this.resolveList(schemaName, propName, objectType, row.uuid, depth - 1);
                } else {
                    result[propName] = [];
                }
            } else {
                // Scalar property
                const value = row[snakeName];
                result[propName] = convertSqliteValue(resolvedType, value);
            }
        });

        return result;
    }

    /**
     * Resolve a FK reference to a full nested object.
     */
    resolveReference(targetSchemaName, uuid, depth) {
        // Try reference data cache first
        const cache = this.referenceDataCache[targetSchemaName];
        if (cache) {
            const cached = cache.get(uuid);
            if (cached) return cached;
        }

        // Try session hydration cache — returns a previously-hydrated version if available.
        // Handles back-references: e.g., Individual→enrolments→ProgramEnrolment→individual
        // would re-hydrate the same Individual at depth 0 without the cache.
        const cacheKey = `${targetSchemaName}:${uuid}`;
        if (this._hydrationCache) {
            const cachedHydration = this._hydrationCache.get(cacheKey);
            if (cachedHydration) return cachedHydration;
        }

        // Query the database
        const tableMeta = this.tableMetaMap.get(targetSchemaName);
        if (!tableMeta) {
            return {uuid};
        }

        const rows = this.executeQuery(
            `SELECT * FROM ${tableMeta.tableName} WHERE "uuid" = ?`,
            [uuid]
        );

        if (!rows || rows.length === 0) {
            return {uuid};
        }

        const hydrated = this.hydrate(targetSchemaName, rows[0], {depth, skipLists: true});

        // Cache in session if hydrated at meaningful depth (has FK refs resolved)
        if (this._hydrationCache && depth >= 1 && hydrated.uuid) {
            this._hydrationCache.set(cacheKey, hydrated);
        }

        // Cache reference data if applicable
        if (cache) {
            cache.set(uuid, hydrated);
        }

        return hydrated;
    }

    /**
     * Resolve a list property by querying the child table for matching FK.
     */
    resolveList(parentSchemaName, propName, childSchemaName, parentUuid, depth) {
        if (_.isNil(parentUuid)) return [];

        const childTableMeta = this.tableMetaMap.get(childSchemaName);
        if (!childTableMeta) return [];

        // Determine the FK column on the child table that points back to the parent
        const fkColumnName = this.findChildFkColumn(parentSchemaName, childSchemaName, childTableMeta);
        if (!fkColumnName) return [];

        const rows = this.executeQuery(
            `SELECT * FROM ${childTableMeta.tableName} WHERE "${fkColumnName}" = ?`,
            [parentUuid]
        );

        if (!rows || rows.length === 0) return [];

        return rows.map(row => this.hydrate(childSchemaName, row, {depth, skipLists: depth > 0}));
    }

    /**
     * Find the FK column on a child table that references the parent.
     * Convention: the column is named after the parent schema in snake_case + "_uuid"
     * e.g., Individual's encounters → encounter table has "individual_uuid" column
     */
    findChildFkColumn(parentSchemaName, childSchemaName, childTableMeta) {
        // First, look at the child's Realm schema to find a property that references the parent
        const childRealmSchema = this.realmSchemaMap.get(childSchemaName);
        if (childRealmSchema) {
            for (const [propName, propDef] of Object.entries(childRealmSchema.properties || {})) {
                if (typeof propDef === "object" && propDef.type === "object" && propDef.objectType === parentSchemaName) {
                    return `${camelToSnake(propName)}_uuid`;
                }
            }
        }

        // Fallback: try parent_schema_name_uuid
        const candidateCol = `${camelToSnake(parentSchemaName)}_uuid`;
        if (childTableMeta.getColumn(candidateCol)) {
            return candidateCol;
        }

        return null;
    }

    /**
     * Hydrate multiple rows.
     */
    hydrateAll(schemaName, rows, options = {}) {
        if (!rows) return [];
        return rows.map(row => this.hydrate(schemaName, row, options));
    }

    /**
     * Start a hydration session. Creates a temporary cache that lives only
     * for the duration of the session, preventing unbounded memory growth.
     * Nested calls are safe — only the outermost pair creates/destroys the cache.
     */
    beginHydrationSession() {
        if (!this._hydrationCache) {
            this._hydrationCache = new Map();
        }
        this._hydrationSessionDepth = (this._hydrationSessionDepth || 0) + 1;
    }

    endHydrationSession() {
        this._hydrationSessionDepth = (this._hydrationSessionDepth || 1) - 1;
        if (this._hydrationSessionDepth <= 0) {
            this._hydrationCache = null;
            this._hydrationSessionDepth = 0;
        }
    }

    /**
     * Build reference data cache from the database.
     * Call this after sync for reference entities.
     */
    buildReferenceCache(referenceSchemaNames) {
        referenceSchemaNames.forEach(schemaName => {
            const tableMeta = this.tableMetaMap.get(schemaName);
            if (!tableMeta) return;

            const rows = this.executeQuery(`SELECT * FROM ${tableMeta.tableName}`, []);
            const cache = new Map();
            (rows || []).forEach(row => {
                const hydrated = this.hydrate(schemaName, row, {skipLists: true, depth: 1});
                if (hydrated.uuid) {
                    cache.set(hydrated.uuid, hydrated);
                }
            });
            this.referenceDataCache[schemaName] = cache;
        });
    }

    /**
     * Flatten a hydrated entity object for SQL INSERT.
     * Reverses hydration: nested objects → FK UUIDs, embedded objects → JSON, dates → epoch ms.
     *
     * @param {string} schemaName
     * @param {Object} entity - the entity object (may be a PersistedObject with .that, or plain object)
     * @returns {Object} flat object with snake_case keys suitable for SQL INSERT
     */
    flatten(schemaName, entity) {
        const realmSchema = this.realmSchemaMap.get(schemaName);
        if (!realmSchema) return entity;

        // Unwrap PersistedObject
        const data = entity.that || entity;
        const result = {};
        const properties = realmSchema.properties || {};

        Object.keys(properties).forEach(propName => {
            const propDef = properties[propName];
            const resolvedType = normalizeRealmType(typeof propDef === "string" ? propDef : propDef.type);
            const objectType = typeof propDef === "object" ? propDef.objectType : null;

            if (resolvedType === "object" && objectType) {
                if (EMBEDDED_SCHEMA_NAMES.has(objectType)) {
                    // Embedded → serialize to JSON
                    const val = data[propName];
                    result[camelToSnake(propName)] = val != null ? JSON.stringify(unwrapThat(val)) : null;
                } else {
                    // Referenced → extract UUID
                    const ref = data[propName];
                    const fkColName = `${camelToSnake(propName)}_uuid`;
                    if (ref && ref.uuid) {
                        result[fkColName] = ref.uuid;
                    } else if (ref && typeof ref === "string") {
                        result[fkColName] = ref;
                    } else {
                        result[fkColName] = null;
                    }
                }
            } else if (resolvedType === "list" && objectType) {
                if (EMBEDDED_SCHEMA_NAMES.has(objectType)) {
                    // Embedded list → JSON array
                    const list = data[propName];
                    if (list) {
                        const arr = Array.isArray(list) ? list : (list.realmList ? Array.from(list) : []);
                        result[camelToSnake(propName)] = JSON.stringify(arr.map(item => unwrapThat(item)));
                    } else {
                        result[camelToSnake(propName)] = "[]";
                    }
                }
                // Referenced lists are skipped — FK is on child table
            } else {
                // Scalar
                const value = data[propName];
                result[camelToSnake(propName)] = convertToSqliteValue(resolvedType, value);
            }
        });

        return result;
    }
}

// ──────────────── Helper functions ────────────────

function parseJsonSafe(value) {
    if (_.isNil(value)) return null;
    if (typeof value === "object") return value; // already parsed
    try {
        return JSON.parse(value);
    } catch (e) {
        return null;
    }
}

function convertSqliteValue(realmType, value) {
    if (_.isNil(value)) return null;

    switch (realmType) {
        case "date":
            // epoch ms → Date
            return typeof value === "number" ? new Date(value) : value;
        case "bool":
            // 0/1 → boolean
            return typeof value === "number" ? value !== 0 : !!value;
        case "int":
        case "float":
        case "double":
            return typeof value === "string" ? parseFloat(value) : value;
        case "decimal128":
            return value != null ? String(value) : null;
        default:
            return value;
    }
}

function convertToSqliteValue(realmType, value) {
    if (_.isNil(value)) return null;

    switch (realmType) {
        case "date":
            // Date → epoch ms
            if (value instanceof Date) return value.getTime();
            if (typeof value === "number") return value;
            return new Date(value).getTime();
        case "bool":
            return value ? 1 : 0;
        case "decimal128":
            return value != null ? String(value) : null;
        default:
            return value;
    }
}

function unwrapThat(obj) {
    if (_.isNil(obj)) return null;
    if (obj.that) return obj.that;
    return obj;
}

export default EntityHydrator;
