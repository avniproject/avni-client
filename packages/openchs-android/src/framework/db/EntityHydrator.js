/**
 * EntityHydrator - Converts flat SQL rows into nested objects matching the
 * `this.that` shape expected by PersistedObject/entity classes.
 *
 * Responsibilities:
 * 1. Resolve FK columns (e.g., subject_type_uuid) -> full nested objects
 * 2. Parse JSON columns (observations, embedded objects) -> objects
 * 3. Attach list properties by querying child tables
 * 4. Convert SQLite types back to JS types (epoch ms -> Date, 0/1 -> bool)
 */

import _ from "lodash";
import {Individual} from "openchs-models";
import {EMBEDDED_SCHEMA_NAMES} from "./SchemaGenerator";
import {camelToSnake, schemaNameToTableName, normalizeRealmType} from "./SqliteUtils";
import General from "../../utility/General";

// Dummy UUIDs used as placeholders in models — must be NULLified before INSERT
// to avoid FK violations (these entities don't exist in the database).
const DUMMY_UUIDS = new Set([
    Individual.getAddressLevelDummyUUID(),
]);

// Overrides for parent.listProp pairs where the child schema has multiple FKs back
// to the same parent type and convention can't disambiguate which FK is the back-reference.
//
// AddressLevel.locationMappings: LocationMapping has both `parent` and `child` of type
// AddressLevel. The `locationMappings` list on an AddressLevel semantically holds mappings
// where THIS AddressLevel is the CHILD of the relationship — so the back-reference FK
// is `child_uuid`, not the default first-match `parent_uuid`. Without this override,
// AddressLevel.getParent() returns this AddressLevel itself, causing infinite recursion
// in appendLineage().
// Every entry here covers a list property whose child schema declares more than
// one FK column back to the parent schema — the convention-based first-match
// fallback in findChildFkColumn cannot disambiguate, and picks a column that is
// either semantically wrong or coincidentally right. Keep one entry per
// (parentSchema.listProperty) pair. `SchemaFkOverrideSweepTest` enforces that
// every such ambiguous list has an entry here.
//
// - AddressLevel.locationMappings → LocationMapping has both `parent` and `child`
//   of type AddressLevel. The list holds mappings where this AddressLevel is the
//   CHILD; first-match would return this AddressLevel itself, causing infinite
//   recursion in appendLineage().
// - Individual.relationships → IndividualRelationship has individualA + individualB.
//   Back-reference goes via individualA (per openchs-models getParentEntity using
//   "individualAUUID"). First-match happens to pick individualA; this entry
//   documents the contract so a future property-order change in the upstream
//   schema doesn't silently break hydration.
// - Individual.groupSubjects → GroupSubject has groupSubject + memberSubject. The
//   list holds GroupSubject rows where THIS individual IS the group, so the
//   back-reference is group_subject_uuid. First-match is correct here; entry
//   documents the contract.
// - Individual.groups → GroupSubject has groupSubject + memberSubject. The list
//   holds GroupSubject rows where THIS individual IS the member; first-match
//   would wrongly pick group_subject_uuid. Override to member_subject_uuid.
export const EXPLICIT_LIST_FK_OVERRIDES = {
    'AddressLevel.locationMappings': 'child_uuid',
    'Individual.relationships': 'individual_a_uuid',
    'Individual.groupSubjects': 'group_subject_uuid',
    'Individual.groups': 'member_subject_uuid',
};

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
        // Individual (depth 2) -> enrolments -> ProgramEnrolment.individual back-ref
        // returns the already-hydrated Individual instead of a depth-0 shallow copy.
        // Created/destroyed per session via beginHydrationSession/endHydrationSession.
        this._hydrationCache = null;

        // Session-scoped batch cache for list properties. Populated by
        // batchPreloadLists() before hydration loop to avoid N+1 queries.
        // Keyed by "${childSchemaName}:${fkColumnName}" -> Map<parentUuid, rows[]>.
        this._listBatchCache = null;

        // When true, hydration paths that would normally deep-load (lists +
        // recursive FK preload) instead return shallow entities (scalar fields
        // + depth-0 cached refs, lists empty). Toggled by SyncService for the
        // duration of a sync, since openchs-models' fromResource calls
        // findByKey("uuid", ...) per child entity — and during sync the caller
        // only needs the parent's uuid for the FK column, not its full subtree.
        this._shallowMode = false;
    }

    setShallowMode(enabled) {
        this._shallowMode = !!enabled;
    }

    isShallowMode() {
        return this._shallowMode;
    }

    /**
     * Default hydration options used by point-lookup paths
     * (objectForPrimaryKey, SqliteResultsProxy when not overridden).
     * Returns shallow options when shallow mode is on.
     */
    getDefaultHydrationOptions() {
        return this._shallowMode
            ? {skipLists: true, depth: 1}
            : {skipLists: false, depth: 3};
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
                    // Embedded object stored as JSON — resolve eagerly (no DB query)
                    const jsonVal = row[snakeName];
                    const _jt0 = this._profileCounters ? Date.now() : 0;
                    const parsed = parseJsonSafe(jsonVal);
                    if (this._profileCounters) { this._profileCounters.jsonParseCalls++; this._profileCounters.jsonParseMs += Date.now() - _jt0; }
                    result[propName] = parsed != null ? this._hydrateEmbedded(parsed, objectType) : null;
                } else {
                    // Referenced entity — FK column is propName_uuid
                    const fkColName = `${snakeName}_uuid`;
                    const fkValue = row[fkColName];
                    if (_.isNil(fkValue)) {
                        result[propName] = null;
                    } else if (depth <= 0) {
                        result[propName] = this._resolveCachedReference(objectType, fkValue);
                    } else {
                        result[propName] = this.resolveReference(objectType, fkValue, depth - 1);
                    }
                }
            } else if (resolvedType === "list" && objectType) {
                if (EMBEDDED_SCHEMA_NAMES.has(objectType)) {
                    // Embedded list stored as JSON — resolve eagerly (no DB query)
                    const jsonVal = row[snakeName];
                    const _jt1 = this._profileCounters ? Date.now() : 0;
                    const parsed = parseJsonSafe(jsonVal) || [];
                    if (this._profileCounters) { this._profileCounters.jsonParseCalls++; this._profileCounters.jsonParseMs += Date.now() - _jt1; }
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
        if (this._profileCounters) this._profileCounters.resolveRefCalls++;

        // Try reference data cache first
        const cache = this.referenceDataCache[targetSchemaName];
        if (cache) {
            const cached = cache.get(uuid);
            if (cached) {
                if (this._profileCounters) this._profileCounters.resolveRefCacheHits++;
                return cached;
            }
        }

        // Try session hydration cache — returns a previously-hydrated version if available.
        // Handles back-references: e.g., Individual->enrolments->ProgramEnrolment->individual
        // would re-hydrate the same Individual at depth 0 without the cache.
        const cacheKey = `${targetSchemaName}:${uuid}`;
        if (this._hydrationCache) {
            const cachedHydration = this._hydrationCache.get(cacheKey);
            if (cachedHydration) {
                if (this._profileCounters) this._profileCounters.resolveRefCacheHits++;
                return cachedHydration;
            }
        }

        if (this._profileCounters) this._profileCounters.resolveRefDbQueries++;

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
     * references to other entities (e.g., Observation.concept -> Concept).
     * This method walks the embedded schema and resolves those references
     * using resolveReference (which checks caches first, then queries DB).
     */
    _hydrateEmbedded(data, schemaName) {
        if (this._profileCounters) this._profileCounters.hydrateEmbeddedCalls++;
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
        if (this._profileCounters) this._profileCounters.resolveListCalls++;
        if (_.isNil(parentUuid)) return [];

        const childTableMeta = this.tableMetaMap.get(childSchemaName);
        if (!childTableMeta) return [];

        // Determine the FK column on the child table that points back to the parent
        const fkColumnName = this.findChildFkColumn(parentSchemaName, childSchemaName, childTableMeta, propName);
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

        if (this._profileCounters) this._profileCounters.resolveListHydrations += rows.length;
        return rows.map(row => this.hydrate(childSchemaName, row, {depth, skipLists: false}));
    }

    /**
     * Batch-preload all FK-referenced list properties for a set of parent UUIDs.
     * Replaces N individual queries per list property with one batch IN query.
     * Recurses into child schemas up to the given depth to preload grandchild
     * lists and FK references at all levels.
     *
     * @param {string} schemaName - parent schema name (e.g., "Individual")
     * @param {Array<string>} parentUuids - UUIDs of all parent rows to preload for
     * @param {number} depth - how many levels deep to preload (default 3)
     */
    batchPreloadLists(schemaName, parentUuids, depth = 3) {
        if (!this._listBatchCache || !parentUuids || parentUuids.length === 0 || depth <= 0) return;

        const realmSchema = this.realmSchemaMap.get(schemaName);
        if (!realmSchema) return;

        const uniqueUuids = [...new Set(parentUuids.filter(u => u != null))];
        if (uniqueUuids.length === 0) return;

        const properties = realmSchema.properties || {};
        const profileEntries = [];
        const profileStart = Date.now();

        Object.keys(properties).forEach(propName => {
            const propDef = properties[propName];
            const resolvedType = normalizeRealmType(typeof propDef === "string" ? propDef : propDef.type);
            const objectType = typeof propDef === "object" ? propDef.objectType : null;

            if (resolvedType !== "list" || !objectType) return;
            if (EMBEDDED_SCHEMA_NAMES.has(objectType)) return; // JSON on parent row

            const childTableMeta = this.tableMetaMap.get(objectType);
            if (!childTableMeta) return;

            const fkColumnName = this.findChildFkColumn(schemaName, objectType, childTableMeta, propName);
            if (!fkColumnName) return;

            const cacheKey = `${objectType}:${fkColumnName}`;
            if (this._listBatchCache.has(cacheKey)) return; // already preloaded

            // Batch fetch with chunking for >999 params (SQLite limit)
            const tListStart = Date.now();
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
            profileEntries.push({list: `${propName}(${objectType})`, rows: allRows.length, ms: Date.now() - tListStart});

            // Recurse: preload grandchild lists for this child schema
            if (depth > 1 && allRows.length > 0) {
                const childUuids = allRows.map(r => r.uuid).filter(u => u != null);
                if (childUuids.length > 0) {
                    this.batchPreloadLists(objectType, childUuids, depth - 1);
                }
            }
        });

        // Phase 2: Pre-fetch FK-referenced entities from the child rows we just loaded.
        // This eliminates the 147K individual SELECT queries during hydration by
        // batch-loading referenced entities (Concept, EncounterType, Form, etc.)
        // into the session cache up front.
        const tFkStart = Date.now();
        const fkPreloadEntries = this._batchPreloadFkReferences(schemaName, parentUuids);
        const tFkEnd = Date.now();
        if (tFkEnd - tFkStart > 500) {
            const fkBreakdown = fkPreloadEntries.map(e => `${e.schema}=${e.loaded}/${e.total}uuids/${e.ms}ms`).join(', ');
            profileEntries.push({list: `fkRefs`, rows: fkPreloadEntries.reduce((s, e) => s + e.loaded, 0), ms: tFkEnd - tFkStart});
            General.logDebug("HydrationProfile", ` batchPreloadFKs ${schemaName}: ${fkBreakdown} | total=${tFkEnd - tFkStart}ms`);
        }

        const totalMs = Date.now() - profileStart;
        if (totalMs > 2000) {
            const breakdown = profileEntries.map(e => `${e.list}=${e.rows}rows/${e.ms}ms`).join(', ');
            General.logDebug("HydrationProfile", ` batchPreload ${schemaName} (${uniqueUuids.length} parents): ${breakdown} | total=${totalMs}ms`);
        }
    }

    /**
     * Scan all batch-preloaded child rows and the parent rows for FK columns,
     * collect unique referenced UUIDs per schema, and batch-fetch them into
     * the session hydration cache.
     *
     * This turns 147K individual SELECT queries into a handful of batch IN queries.
     */
    _batchPreloadFkReferences(parentSchemaName, parentUuids) {
        if (!this._hydrationCache || !this._listBatchCache) return [];

        // Collect FK UUIDs from parent schema and all child schemas that have preloaded rows
        // fkTargets: Map<targetSchemaName, Set<uuid>>
        const fkTargets = new Map();

        const collectFksFromSchema = (schemaName, rows) => {
            const schema = this.realmSchemaMap.get(schemaName);
            if (!schema) return;
            const props = schema.properties || {};

            // Identify FK columns (object-type properties that aren't embedded)
            const fkProps = [];
            for (const [propName, propDef] of Object.entries(props)) {
                const resolvedType = normalizeRealmType(typeof propDef === "string" ? propDef : propDef.type);
                const objectType = typeof propDef === "object" ? propDef.objectType : null;
                if (resolvedType === "object" && objectType && !EMBEDDED_SCHEMA_NAMES.has(objectType)) {
                    // Skip if already in reference data cache (Gender, SubjectType, etc.)
                    if (this.referenceDataCache[objectType]) continue;
                    fkProps.push({col: `${camelToSnake(propName)}_uuid`, targetSchema: objectType});
                }
            }

            if (fkProps.length === 0) return;

            for (const row of rows) {
                for (const {col, targetSchema} of fkProps) {
                    const uuid = row[col];
                    if (uuid && !this._hydrationCache.has(`${targetSchema}:${uuid}`)) {
                        if (!fkTargets.has(targetSchema)) fkTargets.set(targetSchema, new Set());
                        fkTargets.get(targetSchema).add(uuid);
                    }
                }
            }
        };

        // Collect from all preloaded child row sets
        for (const [cacheKey, grouped] of this._listBatchCache.entries()) {
            const childSchemaName = cacheKey.split(':')[0];
            // Flatten grouped rows
            const allChildRows = [];
            for (const rows of grouped.values()) {
                for (const row of rows) allChildRows.push(row);
            }
            collectFksFromSchema(childSchemaName, allChildRows);
        }

        // Batch-fetch each target schema. Skip schemas that are already batch-
        // preloaded as children in _listBatchCache — they will be hydrated at a
        // deeper depth during the parent's main hydration. Caching them here at
        // depth 0 would pollute the session cache with shallow stubs that lack
        // list properties (e.g., FormElementGroup without formElements), causing
        // back-references from child entities to find the stub instead of the
        // properly-hydrated version.
        const batchPreloadedSchemas = new Set();
        if (this._listBatchCache) {
            for (const cacheKey of this._listBatchCache.keys()) {
                batchPreloadedSchemas.add(cacheKey.split(':')[0]);
            }
        }

        const profileEntries = [];
        for (const [targetSchema, uuidSet] of fkTargets.entries()) {
            // Skip if this schema is already being batch-loaded as part of the
            // current preload chain — it will get hydrated deeper later.
            if (batchPreloadedSchemas.has(targetSchema)) continue;

            const tableMeta = this.tableMetaMap.get(targetSchema);
            if (!tableMeta) continue;

            const uuids = [...uuidSet];
            const tStart = Date.now();
            const CHUNK_SIZE = 999;

            for (let i = 0; i < uuids.length; i += CHUNK_SIZE) {
                const chunk = uuids.slice(i, i + CHUNK_SIZE);
                const placeholders = chunk.map(() => "?").join(", ");
                const rows = this.executeQuery(
                    `SELECT * FROM ${tableMeta.tableName} WHERE "uuid" IN (${placeholders})`,
                    chunk
                );
                if (rows) {
                    for (const row of rows) {
                        if (row.uuid) {
                            const cacheKey = `${targetSchema}:${row.uuid}`;
                            if (!this._hydrationCache.has(cacheKey)) {
                                const hydrated = this.hydrate(targetSchema, row, {depth: 0, skipLists: true});
                                this._hydrationCache.set(cacheKey, hydrated);
                            }
                        }
                    }
                }
            }

            profileEntries.push({schema: targetSchema, total: uuids.length, loaded: uuids.length, ms: Date.now() - tStart});
        }

        return profileEntries;
    }

    /**
     * Find the FK column on a child table that references the parent.
     *
     * Resolution order (most specific first):
     *   1. EXPLICIT_LIST_FK_OVERRIDES — for parent.listProp pairs where the child schema
     *      has multiple FKs back to the same parent type and convention can't disambiguate.
     *   2. The child schema's first property of type {object, parentSchemaName}.
     *   3. Fallback: column named `${snake_case(parentSchemaName)}_uuid`.
     *
     * Example needing override: AddressLevel.locationMappings → LocationMapping.child_uuid.
     * LocationMapping has both `parent` and `child` of type AddressLevel; the parent's
     * `locationMappings` list semantically holds mappings where this AddressLevel is the
     * CHILD of the relationship (i.e. its row appears as `child_uuid`).
     *
     * @param {string} parentSchemaName
     * @param {string} childSchemaName
     * @param {Object} childTableMeta
     * @param {string} [parentListPropName] - the name of the list property on the parent
     *     schema that resolves to this child. Used to disambiguate multi-FK back-references.
     */
    findChildFkColumn(parentSchemaName, childSchemaName, childTableMeta, parentListPropName) {
        // 1. Explicit overrides for known multi-FK back-references.
        if (parentListPropName) {
            const overrideKey = `${parentSchemaName}.${parentListPropName}`;
            const overrideFk = EXPLICIT_LIST_FK_OVERRIDES[overrideKey];
            if (overrideFk) return overrideFk;
        }

        // 2. First property on the child schema that references the parent type.
        const childRealmSchema = this.realmSchemaMap.get(childSchemaName);
        if (childRealmSchema) {
            for (const [propName, propDef] of Object.entries(childRealmSchema.properties || {})) {
                if (typeof propDef === "object" && propDef.type === "object" && propDef.objectType === parentSchemaName) {
                    return `${camelToSnake(propName)}_uuid`;
                }
            }
        }

        // 3. Fallback: try parent_schema_name_uuid
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
        // Session-level profiling counters
        if (this._hydrationSessionDepth === 1) {
            this._profileCounters = {
                resolveRefCalls: 0, resolveRefDbQueries: 0, resolveRefCacheHits: 0,
                hydrateEmbeddedCalls: 0, resolveListCalls: 0, resolveListHydrations: 0,
                jsonParseCalls: 0, jsonParseMs: 0,
            };
        }
    }

    endHydrationSession() {
        this._hydrationSessionDepth = (this._hydrationSessionDepth || 1) - 1;
        if (this._hydrationSessionDepth <= 0) {
            // Log profile counters if significant work was done
            const c = this._profileCounters;
            if (c && (c.resolveRefCalls > 100 || c.resolveListHydrations > 100)) {
                General.logDebug("HydrationProfile", ` session: refCalls=${c.resolveRefCalls} (db=${c.resolveRefDbQueries}, cache=${c.resolveRefCacheHits}), embedded=${c.hydrateEmbeddedCalls}, lists=${c.resolveListCalls} (childHydrations=${c.resolveListHydrations}), jsonParse=${c.jsonParseCalls}/${c.jsonParseMs}ms`);
            }
            this._hydrationCache = null;
            this._listBatchCache = null;
            this._hydrationSessionDepth = 0;
            this._profileCounters = null;
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
                // (e.g., 5000 Concepts x 1 query each for answers -> 1 batch query)
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
     * Reverses hydration: nested objects -> FK UUIDs, embedded objects -> JSON, dates -> epoch ms.
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
            // Skip properties not present on the source object.
            // Realm's upsert with a partial object only updates fields that are
            // present — omitted fields keep their existing DB values. We match
            // this by excluding undefined properties from the flattened output,
            // so the INSERT column list won't include them and ON CONFLICT UPDATE
            // won't overwrite them.
            if (!(propName in data)) return;

            const propDef = properties[propName];
            const resolvedType = normalizeRealmType(typeof propDef === "string" ? propDef : propDef.type);
            const objectType = typeof propDef === "object" ? propDef.objectType : null;

            if (resolvedType === "object" && objectType) {
                if (EMBEDDED_SCHEMA_NAMES.has(objectType)) {
                    // Embedded -> serialize to JSON (schema-aware to avoid cycles)
                    const val = data[propName];
                    result[camelToSnake(propName)] = val != null ? JSON.stringify(flattenEmbedded(unwrapThat(val), objectType, this.realmSchemaMap)) : null;
                } else {
                    // Referenced -> extract UUID
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
                    // Embedded list -> JSON array (schema-aware to avoid cycles)
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
            // epoch ms -> Date
            return typeof value === "number" ? new Date(value) : value;
        case "bool":
            // 0/1 -> boolean
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
            // Date -> epoch ms
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
 * object references (e.g. Observation.concept -> Concept) are stored as
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
                // Sub-embedded -> recurse
                result[propName] = val != null ? flattenEmbedded(unwrapThat(val), objectType, realmSchemaMap) : null;
            } else {
                // Referenced object -> store UUID only
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
                // Sub-embedded list -> recurse
                const list = val;
                if (list) {
                    const arr = Array.isArray(list) ? list : Array.from(list);
                    result[propName] = arr.map(item => flattenEmbedded(unwrapThat(item), objectType, realmSchemaMap));
                } else {
                    result[propName] = [];
                }
            } else {
                // Referenced list -> store UUIDs only
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