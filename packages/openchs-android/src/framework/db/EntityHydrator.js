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
import {Individual} from "openchs-models";
import {EMBEDDED_SCHEMA_NAMES} from "./DrizzleSchemaGenerator";
import {camelToSnake, schemaNameToTableName, normalizeRealmType} from "./RealmQueryParser";

// Dummy UUIDs used as placeholders in models — must be NULLified before INSERT
// to avoid FK violations (these entities don't exist in the database).
const DUMMY_UUIDS = new Set([
    Individual.getAddressLevelDummyUUID(),
]);

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

        // Session-scoped batch cache for list properties. Populated by
        // batchPreloadLists() before hydration loop to avoid N+1 queries.
        // Keyed by "${childSchemaName}:${fkColumnName}" → Map<parentUuid, rows[]>.
        this._listBatchCache = null;
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
                    // Embedded object stored as JSON — resolve FK references within it
                    const jsonVal = row[snakeName];
                    const parsed = parseJsonSafe(jsonVal);
                    result[propName] = parsed != null ? this._hydrateEmbedded(parsed, objectType) : null;
                } else {
                    // Referenced entity — FK column is propName_uuid
                    const fkColName = `${snakeName}_uuid`;
                    const fkValue = row[fkColName];
                    if (_.isNil(fkValue)) {
                        result[propName] = null;
                    } else if (depth <= 0) {
                        // At depth 0, resolve from caches instead of querying DB.
                        // This provides richer objects for list items (e.g., ProgramEnrolment.program)
                        // without additional DB queries or infinite recursion.
                        result[propName] = this._resolveCachedReference(objectType, fkValue);
                    } else {
                        result[propName] = this.resolveReference(objectType, fkValue, depth - 1);
                    }
                }
            } else if (resolvedType === "list" && objectType) {
                if (EMBEDDED_SCHEMA_NAMES.has(objectType)) {
                    // Embedded list stored as JSON — resolve FK references within each item
                    const jsonVal = row[snakeName];
                    const parsed = parseJsonSafe(jsonVal) || [];
                    result[propName] = parsed.map(item => item != null ? this._hydrateEmbedded(item, objectType) : null);
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

        const hydrated = this.hydrate(targetSchemaName, rows[0], {depth, skipLists: false});

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
     * Resolve a FK reference from caches first, falling back to a depth-0
     * DB query if no cache hit. Used at depth 0 to provide objects with
     * scalar properties (name, datatype, etc.) populated — not just {uuid} stubs.
     *
     * Depth-0 hydration is safe from infinite recursion: it fills scalar fields,
     * skips lists, and uses this same method for its own FKs (which will hit the
     * session cache since the parent is pre-registered before processing children).
     */
    _resolveCachedReference(targetSchemaName, uuid) {
        // Check reference data cache (reference entities like Program, SubjectType, etc.)
        const refCache = this.referenceDataCache[targetSchemaName];
        if (refCache) {
            const cached = refCache.get(uuid);
            if (cached) return cached;
        }

        // Check session hydration cache (entities hydrated earlier in same session)
        if (this._hydrationCache) {
            const cacheKey = `${targetSchemaName}:${uuid}`;
            const cached = this._hydrationCache.get(cacheKey);
            if (cached) return cached;
        }

        // Fallback: resolve from DB at depth 0 (scalar properties only).
        // This ensures FK-referenced entities at depth 0 have their scalar
        // fields populated (e.g., Concept.datatype, Program.name) instead
        // of returning bare {uuid} stubs.
        return this.resolveReference(targetSchemaName, uuid, 0);
    }

    /**
     * Resolve FK references within an embedded JSON object.
     * Embedded objects (e.g., Observation) are stored as JSON but may contain
     * references to other entities (e.g., Observation.concept → Concept).
     * This method walks the embedded schema and resolves those references
     * using resolveReference (which checks caches first, then queries DB).
     */
    _hydrateEmbedded(data, schemaName) {
        if (_.isNil(data)) return null;
        const schema = this.realmSchemaMap.get(schemaName);
        if (!schema || !schema.properties) return data;

        const result = {...data}; // shallow copy to avoid mutating stored JSON
        const properties = schema.properties;

        Object.keys(properties).forEach(propName => {
            if (!(propName in result)) return;

            const propDef = properties[propName];
            const resolvedType = normalizeRealmType(typeof propDef === "string" ? propDef : propDef.type);
            const objectType = typeof propDef === "object" ? propDef.objectType : null;

            if (resolvedType === "object" && objectType) {
                const val = result[propName];
                if (_.isNil(val)) return;

                if (EMBEDDED_SCHEMA_NAMES.has(objectType)) {
                    // Nested embedded object — recurse
                    result[propName] = this._hydrateEmbedded(val, objectType);
                } else {
                    // FK reference stored as {uuid: "..."} — resolve via DB/cache
                    const uuid = val.uuid || (typeof val === "string" ? val : null);
                    if (uuid) {
                        result[propName] = this.resolveReference(objectType, uuid, 1);
                    }
                }
            } else if (resolvedType === "list" && objectType) {
                const list = result[propName];
                if (!Array.isArray(list)) return;

                if (EMBEDDED_SCHEMA_NAMES.has(objectType)) {
                    result[propName] = list.map(item => item != null ? this._hydrateEmbedded(item, objectType) : null);
                } else {
                    // List of FK references
                    result[propName] = list.map(item => {
                        if (_.isNil(item)) return null;
                        const uuid = item.uuid || (typeof item === "string" ? item : null);
                        return uuid ? this.resolveReference(objectType, uuid, 1) : item;
                    });
                }
            }
        });

        return result;
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

        // Check batch cache first (populated by batchPreloadLists)
        let rows;
        const cacheKey = `${childSchemaName}:${fkColumnName}`;
        if (this._listBatchCache && this._listBatchCache.has(cacheKey)) {
            const grouped = this._listBatchCache.get(cacheKey);
            rows = grouped.get(parentUuid) || [];
        } else {
            // Fallback to individual query (when not in a batch session)
            rows = this.executeQuery(
                `SELECT * FROM ${childTableMeta.tableName} WHERE "${fkColumnName}" = ?`,
                [parentUuid]
            );
            if (!rows || rows.length === 0) return [];
        }

        if (rows.length === 0) return [];

        return rows.map(row => this.hydrate(childSchemaName, row, {depth, skipLists: false}));
    }

    /**
     * Batch-preload all FK-referenced list properties for a set of parent UUIDs.
     * Replaces N individual queries per list property with one batch IN query.
     *
     * @param {string} schemaName - parent schema name (e.g., "Individual")
     * @param {Array<string>} parentUuids - UUIDs of all parent rows to preload for
     */
    batchPreloadLists(schemaName, parentUuids) {
        if (!this._listBatchCache || !parentUuids || parentUuids.length === 0) return;

        const realmSchema = this.realmSchemaMap.get(schemaName);
        if (!realmSchema) return;

        const uniqueUuids = [...new Set(parentUuids.filter(u => u != null))];
        if (uniqueUuids.length === 0) return;

        const properties = realmSchema.properties || {};

        Object.keys(properties).forEach(propName => {
            const propDef = properties[propName];
            const resolvedType = normalizeRealmType(typeof propDef === "string" ? propDef : propDef.type);
            const objectType = typeof propDef === "object" ? propDef.objectType : null;

            if (resolvedType !== "list" || !objectType) return;
            if (EMBEDDED_SCHEMA_NAMES.has(objectType)) return; // JSON on parent row

            const childTableMeta = this.tableMetaMap.get(objectType);
            if (!childTableMeta) return;

            const fkColumnName = this.findChildFkColumn(schemaName, objectType, childTableMeta);
            if (!fkColumnName) return;

            const cacheKey = `${objectType}:${fkColumnName}`;
            if (this._listBatchCache.has(cacheKey)) return; // already preloaded

            // Batch fetch with chunking for >999 params (SQLite limit)
            const CHUNK_SIZE = 999;
            const allRows = [];
            for (let i = 0; i < uniqueUuids.length; i += CHUNK_SIZE) {
                const chunk = uniqueUuids.slice(i, i + CHUNK_SIZE);
                const placeholders = chunk.map(() => "?").join(", ");
                const rows = this.executeQuery(
                    `SELECT * FROM ${childTableMeta.tableName} WHERE "${fkColumnName}" IN (${placeholders})`,
                    chunk
                );
                if (rows) allRows.push(...rows);
            }

            // Group by parent UUID
            const grouped = new Map();
            for (const row of allRows) {
                const parentId = row[fkColumnName];
                if (!grouped.has(parentId)) grouped.set(parentId, []);
                grouped.get(parentId).push(row);
            }

            this._listBatchCache.set(cacheKey, grouped);
        });
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
        if (!this._listBatchCache) {
            this._listBatchCache = new Map();
        }
        this._hydrationSessionDepth = (this._hydrationSessionDepth || 0) + 1;
    }

    endHydrationSession() {
        this._hydrationSessionDepth = (this._hydrationSessionDepth || 1) - 1;
        if (this._hydrationSessionDepth <= 0) {
            this._hydrationCache = null;
            this._listBatchCache = null;
            this._hydrationSessionDepth = 0;
        }
    }

    /**
     * Build reference data cache from the database.
     * Call this after sync for reference entities.
     *
     * @param {Array} cacheConfigs - array of {schemaName, depth, skipLists} objects.
     *   Processing order matters: schemas whose cached entities are referenced as FKs
     *   by later schemas should come first (e.g., Concept before Form, so that
     *   FormElement.concept resolves from the Concept cache during Form hydration).
     */
    buildReferenceCache(cacheConfigs) {
        this.beginHydrationSession();
        try {
            cacheConfigs.forEach(({schemaName, depth = 1, skipLists = true}) => {
                const tableMeta = this.tableMetaMap.get(schemaName);
                if (!tableMeta) return;

                const rows = this.executeQuery(`SELECT * FROM ${tableMeta.tableName}`, []);

                // Batch-preload list properties to avoid N+1 queries
                // (e.g., 5000 Concepts × 1 query each for answers → 1 batch query)
                if (!skipLists && rows.length > 0) {
                    const uuids = rows.map(r => r.uuid).filter(u => u != null);
                    this.batchPreloadLists(schemaName, uuids);
                }

                const cache = new Map();
                (rows || []).forEach(row => {
                    const hydrated = this.hydrate(schemaName, row, {skipLists, depth});
                    if (hydrated.uuid) {
                        cache.set(hydrated.uuid, hydrated);
                    }
                });
                this.referenceDataCache[schemaName] = cache;
            });
        } finally {
            this.endHydrationSession();
        }
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
                    // Embedded → serialize to JSON (schema-aware to avoid cycles)
                    const val = data[propName];
                    result[camelToSnake(propName)] = val != null ? JSON.stringify(flattenEmbedded(unwrapThat(val), objectType, this.realmSchemaMap)) : null;
                } else {
                    // Referenced → extract UUID
                    const ref = data[propName];
                    const fkColName = `${camelToSnake(propName)}_uuid`;
                    let fkUuid = null;
                    if (ref && ref.uuid) {
                        fkUuid = ref.uuid;
                    } else if (ref && typeof ref === "string") {
                        fkUuid = ref;
                    }
                    result[fkColName] = (fkUuid && DUMMY_UUIDS.has(fkUuid)) ? null : fkUuid;
                }
            } else if (resolvedType === "list" && objectType) {
                if (EMBEDDED_SCHEMA_NAMES.has(objectType)) {
                    // Embedded list → JSON array (schema-aware to avoid cycles)
                    const list = data[propName];
                    if (list) {
                        const arr = Array.isArray(list) ? list : (list.realmList ? Array.from(list) : []);
                        result[camelToSnake(propName)] = JSON.stringify(arr.map(item => flattenEmbedded(unwrapThat(item), objectType, this.realmSchemaMap)));
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

/**
 * Schema-aware serialization of an embedded object.
 * Processes each property according to the embedded schema so that
 * object references (e.g. Observation.concept → Concept) are stored as
 * UUIDs instead of full objects, avoiding cyclical JSON structures.
 */
function flattenEmbedded(data, schemaName, realmSchemaMap) {
    if (_.isNil(data)) return null;
    const schema = realmSchemaMap.get(schemaName);
    if (!schema || !schema.properties) return data;

    const result = {};
    const properties = schema.properties;

    Object.keys(properties).forEach(propName => {
        const propDef = properties[propName];
        const resolvedType = normalizeRealmType(typeof propDef === "string" ? propDef : propDef.type);
        const objectType = typeof propDef === "object" ? propDef.objectType : null;
        const val = data[propName];

        if (resolvedType === "object" && objectType) {
            if (EMBEDDED_SCHEMA_NAMES.has(objectType)) {
                // Sub-embedded → recurse
                result[propName] = val != null ? flattenEmbedded(unwrapThat(val), objectType, realmSchemaMap) : null;
            } else {
                // Referenced object → store UUID only
                const ref = unwrapThat(val);
                if (ref && ref.uuid) {
                    result[propName] = {uuid: ref.uuid};
                } else if (ref && typeof ref === "string") {
                    result[propName] = {uuid: ref};
                } else {
                    result[propName] = null;
                }
            }
        } else if (resolvedType === "list" && objectType) {
            if (EMBEDDED_SCHEMA_NAMES.has(objectType)) {
                // Sub-embedded list → recurse
                const list = val;
                if (list) {
                    const arr = Array.isArray(list) ? list : Array.from(list);
                    result[propName] = arr.map(item => flattenEmbedded(unwrapThat(item), objectType, realmSchemaMap));
                } else {
                    result[propName] = [];
                }
            } else {
                // Referenced list → store UUIDs only
                const list = val;
                if (list) {
                    const arr = Array.isArray(list) ? list : Array.from(list);
                    result[propName] = arr.map(item => {
                        const ref = unwrapThat(item);
                        return ref && ref.uuid ? {uuid: ref.uuid} : null;
                    }).filter(x => x != null);
                } else {
                    result[propName] = [];
                }
            }
        } else {
            // Scalar — keep as-is
            result[propName] = val;
        }
    });

    return result;
}

function unwrapThat(obj) {
    if (_.isNil(obj)) return null;
    if (obj.that) return obj.that;
    return obj;
}

export default EntityHydrator;
