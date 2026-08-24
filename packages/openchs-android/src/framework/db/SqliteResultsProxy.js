/**
 * SqliteResultsProxy - Drop-in replacement for RealmResultsProxy.
 *
 * Implements the same API surface:
 *   - filtered(query, ...args) → chainable
 *   - sorted(descriptor, reverse?) → chainable
 *   - map(), forEach(), filter(), find(), some(), every(), slice()
 *   - length (via Proxy), [index] (via Proxy)
 *   - isEmpty(), max(prop), min(prop), sum(prop)
 *   - [Symbol.iterator]()
 *
 * Lazy query builder: accumulates filter/sort criteria, executes SQL on first data access.
 * Uses JS Proxy handler for [index] and .length access (same as RealmResultsProxyHandler).
 */

import _ from "lodash";
import RealmQueryParser from "./RealmQueryParser";
import {camelToSnake, schemaNameToTableName} from "./SqliteUtils";
import JsFallbackFilterEvaluator from "./JsFallbackFilterEvaluator";
import General from "../../utility/General";

const SqliteResultsProxyHandler = {
    get: function (target, name, receiver) {
        if (typeof name !== "symbol" && !isNaN(name) && !isNaN(parseInt(name))) {
            return target.getAt(Number.parseInt(name));
        } else if (name === "length") {
            return target.getLength();
        } else if (name === "realmCollection") {
            // getUnderlyingRealmCollection() must yield raw underlying objects —
            // Realm hands out Realm.Objects and callers re-wrap per item
            // (e.g. new Individual(x.item)), so returning wrapped entities here
            // double-wraps them and writes via entity.that then hit getter-only
            // class properties.
            return target.getRawCollection();
        }
        return Reflect.get(...arguments);
    },
};

const RawCollectionProxyHandler = {
    get: function (target, name, receiver) {
        if (typeof name !== "symbol" && !isNaN(name) && !isNaN(parseInt(name))) {
            const entity = target.getAt(Number.parseInt(name));
            return (entity && entity.that) ? entity.that : entity;
        } else if (name === "length") {
            return target.getLength();
        } else if (name === "realmCollection") {
            return receiver;
        }
        return Reflect.get(target, name);
    },
};

class SqliteResultsProxy {
    /**
     * Create a new proxied instance.
     *
     * @param {Object} params
     * @param {string} params.schemaName - Realm schema name
     * @param {string} params.tableName - SQL table name
     * @param {Function} params.entityClass - Entity constructor
     * @param {Function} params.executeQuery - (sql, params) => rows[]
     * @param {Object} params.hydrator - EntityHydrator instance
     * @param {Map} params.realmSchemaMap - for RealmQueryParser dot-path resolution
     * @param {Array} params.whereClauses - accumulated WHERE conditions
     * @param {Array} params.whereParams - accumulated parameters
     * @param {Array} params.joinClauses - accumulated JOINs
     * @param {Array|null} params.orderByTerms - ORDER BY terms as [{expr, dir}]
     * @param {Array|null} params.jsFallbackFilters - Realm queries routed to JS fallback filtering
     * @param {number|null} params.limitClause - SQL LIMIT value extracted from limit(N)
     */
    static create(params) {
        return new Proxy(new SqliteResultsProxy(params), SqliteResultsProxyHandler);
    }

    constructor({
                    schemaName,
                    tableName,
                    entityClass,
                    executeQuery,
                    hydrator,
                    realmSchemaMap,
                    whereClauses = [],
                    whereParams = [],
                    joinClauses = [],
                    orderByTerms = null,
                    distinctColumns = null,
                    distinctOrderBy = null,
                    jsFallbackFilters = [],
                    limitClause = null,
                    hydrationOptions = null,
                    queryCache = null,
                }) {
        this.schemaName = schemaName;
        this.tableName = tableName || schemaNameToTableName(schemaName);
        this.entityClass = entityClass;
        this.executeQuery = executeQuery;
        this.hydrator = hydrator;
        this.realmSchemaMap = realmSchemaMap || new Map();

        // Query builder state
        this.whereClauses = [...whereClauses];
        this.whereParams = [...whereParams];
        this.joinClauses = [...joinClauses];
        this.orderByTerms = orderByTerms;
        this.distinctColumns = distinctColumns;
        this.distinctOrderBy = distinctOrderBy;
        this.jsFallbackFilters = [...jsFallbackFilters];
        this.limitClause = limitClause;
        // Hydration options: {skipLists, depth} — default is full hydration
        this.hydrationOptions = hydrationOptions || {skipLists: false, depth: 3};

        // Cross-query cache (shared across proxy instances within a dashboard refresh)
        this._queryCache = queryCache;

        // Cached results
        this._rows = null;
        this._entities = null;
        this._executed = false;

        this.logQueries = false;
    }

    setLogQueries(value) {
        this.logQueries = value;
    }

    /**
     * Resolve hydration options at execution time, honoring the hydrator's
     * shallow mode if it's enabled and the caller hasn't explicitly opted in to
     * deep hydration via withHydration(). When shallow mode is on (e.g., during
     * sync), all queries return shallow entities to avoid deep-loading parents'
     * full subtrees on every findByKey call.
     */
    _effectiveHydrationOptions() {
        if (this.hydrator && typeof this.hydrator.isShallowMode === "function" && this.hydrator.isShallowMode()) {
            return this.hydrator.getDefaultHydrationOptions();
        }
        return this.hydrationOptions;
    }

    // ──── Chainable query builders ────

    /**
     * Set hydration options for this query. Controls how deeply entities are hydrated.
     * Use {skipLists: true, depth: 1} for search results that only need scalar + reference FK fields.
     * Default is {skipLists: false, depth: 3} for full hydration.
     */
    withHydration(options) {
        return SqliteResultsProxy.create({
            schemaName: this.schemaName,
            tableName: this.tableName,
            entityClass: this.entityClass,
            executeQuery: this.executeQuery,
            hydrator: this.hydrator,
            realmSchemaMap: this.realmSchemaMap,
            whereClauses: [...this.whereClauses],
            whereParams: [...this.whereParams],
            joinClauses: [...this.joinClauses],
            orderByTerms: this.orderByTerms,
            distinctColumns: this.distinctColumns,
            distinctOrderBy: this.distinctOrderBy,
            jsFallbackFilters: [...this.jsFallbackFilters],
            limitClause: this.limitClause,
            hydrationOptions: options,
            queryCache: this._queryCache,
        });
    }

    filtered(query, ...args) {
        if (this.logQueries) console.log("SqliteResultsProxy.filtered", this.schemaName, query, ...args);

        // Pass current join count so new aliases don't collide with existing ones
        const aliasOffset = this.joinClauses.length;
        const parseResult = RealmQueryParser.parse(query, args, this.schemaName, this.realmSchemaMap, aliasOffset);

        const newParams = {
            schemaName: this.schemaName,
            tableName: this.tableName,
            entityClass: this.entityClass,
            executeQuery: this.executeQuery,
            hydrator: this.hydrator,
            realmSchemaMap: this.realmSchemaMap,
            whereClauses: [...this.whereClauses],
            whereParams: [...this.whereParams],
            joinClauses: [...this.joinClauses],
            orderByTerms: this.orderByTerms,
            distinctColumns: this.distinctColumns,
            distinctOrderBy: this.distinctOrderBy,
            jsFallbackFilters: [...this.jsFallbackFilters],
            limitClause: this.limitClause,
            hydrationOptions: this.hydrationOptions,
            queryCache: this._queryCache,
        };

        if (parseResult.unsupported) {
            // Entire query needs JS fallback — store for post-hydration filtering
            newParams.jsFallbackFilters.push({query, args, reason: parseResult.reason});
        } else {
            if (parseResult.where) {
                newParams.whereClauses.push(parseResult.where);
                newParams.whereParams.push(...parseResult.params);
            }
            if (parseResult.joins) {
                parseResult.joins.forEach(j => {
                    newParams.joinClauses.push(j);
                });
            }
            if (parseResult.distinct) {
                newParams.distinctColumns = parseResult.distinct.columns;
                newParams.distinctOrderBy = parseResult.distinct.orderByTerms;
            }
            if (parseResult.orderByTerms) {
                newParams.orderByTerms = parseResult.orderByTerms;
            }
            // Capture clauses that partial parse couldn't translate — route to JS fallback
            if (parseResult.partialParse && parseResult.skippedClauses?.length > 0) {
                parseResult.skippedClauses.forEach(clause => {
                    newParams.jsFallbackFilters.push({query: clause, args, reason: "partial_parse_skip"});
                });
            }
        }

        // Capture limit from parse result (overrides any prior limit in chain)
        if (parseResult.limit != null) {
            newParams.limitClause = parseResult.limit;
        }

        return SqliteResultsProxy.create(newParams);
    }

    sorted(descriptor, reverse) {
        const extraJoins = [];
        const aliasOffset = this.joinClauses.length;
        let aliasCounter = aliasOffset;

        // Resolve a single property path (may contain dots) to a SQL column reference
        const resolveOrderProp = (prop) => {
            if (!prop.includes(".")) {
                return `t0."${camelToSnake(prop)}"`;
            }
            // Dot-notation: resolve through schema relationships with JOINs
            const parts = prop.split(".");
            let currentSchema = this.schemaName;
            let currentAlias = "t0";

            for (let i = 0; i < parts.length - 1; i++) {
                const partName = parts[i];
                const schema = this.realmSchemaMap.get(currentSchema);
                if (!schema) return `t0."${camelToSnake(prop.replace(/\./g, "_"))}"`;

                const propSchema = schema.properties[partName];
                if (!propSchema || (typeof propSchema === "object" ? propSchema.type : propSchema) !== "object") {
                    return `${currentAlias}."${camelToSnake(partName)}"`;
                }

                const targetSchema = typeof propSchema === "object" ? propSchema.objectType : null;
                if (!targetSchema) return `${currentAlias}."${camelToSnake(partName)}"`;

                const newAlias = `t${++aliasCounter}`;
                const targetTableName = schemaNameToTableName(targetSchema);
                const fkColumn = `${camelToSnake(partName)}_uuid`;

                extraJoins.push({
                    table: targetTableName,
                    alias: newAlias,
                    on: `${currentAlias}."${fkColumn}" = ${newAlias}."uuid"`,
                });

                currentAlias = newAlias;
                currentSchema = targetSchema;
            }

            const lastPart = parts[parts.length - 1];
            return `${currentAlias}."${camelToSnake(lastPart)}"`;
        };

        let orderBy;
        if (typeof descriptor === "string") {
            orderBy = [{expr: resolveOrderProp(descriptor), dir: reverse ? "DESC" : "ASC"}];
        } else if (Array.isArray(descriptor)) {
            orderBy = descriptor.map(([prop, rev]) => ({expr: resolveOrderProp(prop), dir: rev ? "DESC" : "ASC"}));
        } else {
            orderBy = [{expr: resolveOrderProp(String(descriptor)), dir: "ASC"}];
        }

        return SqliteResultsProxy.create({
            schemaName: this.schemaName,
            tableName: this.tableName,
            entityClass: this.entityClass,
            executeQuery: this.executeQuery,
            hydrator: this.hydrator,
            realmSchemaMap: this.realmSchemaMap,
            whereClauses: [...this.whereClauses],
            whereParams: [...this.whereParams],
            joinClauses: [...this.joinClauses, ...extraJoins],
            orderByTerms: orderBy,
            distinctColumns: this.distinctColumns,
            distinctOrderBy: this.distinctOrderBy,
            jsFallbackFilters: [...this.jsFallbackFilters],
            limitClause: this.limitClause,
            hydrationOptions: this.hydrationOptions,
            queryCache: this._queryCache,
        });
    }

    // ──── Query execution ────

    static _renderOrderBy(terms) {
        return terms.map(t => `${t.expr} ${t.dir}`).join(", ");
    }

    _buildSql() {
        // Windowed DISTINCT: ROW_NUMBER() OVER (PARTITION BY <cols> ORDER BY <sort|rowid>) = 1.
        // The window wraps the fully-accumulated WHERE (distinct applied last — matches the
        // prior JS fallback), so filters added after the distinct still narrow rows first.
        if (this.distinctColumns && this.distinctColumns.length > 0) {
            const partition = this.distinctColumns.join(", ");
            const windowOrder = this.distinctOrderBy && this.distinctOrderBy.length > 0
                ? SqliteResultsProxy._renderOrderBy(this.distinctOrderBy)
                : "t0.rowid";

            // The outer query sees only t0.* from the subquery, so an outer ORDER BY
            // that references t0 or a joined alias must be projected into the subquery
            // and referenced from the outer scope by a synthetic alias.
            let extraSelect = "";
            let outerOrderBy = null;
            if (this.orderByTerms && this.orderByTerms.length > 0) {
                extraSelect = this.orderByTerms.map((t, i) => `, ${t.expr} AS __ob${i}`).join("");
                outerOrderBy = this.orderByTerms.map((t, i) => `__ob${i} ${t.dir}`).join(", ");
            }

            let inner = `SELECT t0.*, ROW_NUMBER() OVER (PARTITION BY ${partition} ORDER BY ${windowOrder}) AS __rn${extraSelect} FROM ${this.tableName} AS t0`;
            for (const join of this.joinClauses) {
                inner += ` LEFT JOIN ${join.table} AS ${join.alias} ON ${join.on}`;
            }
            if (this.whereClauses.length > 0) {
                inner += ` WHERE ${this.whereClauses.join(" AND ")}`;
            }
            let sql = `SELECT * FROM (${inner}) WHERE __rn = 1`;
            if (outerOrderBy) {
                sql += ` ORDER BY ${outerOrderBy}`;
            }
            if (this.limitClause != null && this.jsFallbackFilters.length === 0) {
                sql += ` LIMIT ${this.limitClause}`;
            }
            return {sql, params: this.whereParams};
        }

        // Use DISTINCT when JOINs are present to avoid duplicate parent rows.
        const distinct = this.joinClauses.length > 0 ? "DISTINCT " : "";
        let sql = `SELECT ${distinct}t0.* FROM ${this.tableName} AS t0`;

        for (const join of this.joinClauses) {
            sql += ` LEFT JOIN ${join.table} AS ${join.alias} ON ${join.on}`;
        }
        if (this.whereClauses.length > 0) {
            sql += ` WHERE ${this.whereClauses.join(" AND ")}`;
        }
        if (this.orderByTerms && this.orderByTerms.length > 0) {
            sql += ` ORDER BY ${SqliteResultsProxy._renderOrderBy(this.orderByTerms)}`;
        }
        if (this.limitClause != null && this.jsFallbackFilters.length === 0) {
            sql += ` LIMIT ${this.limitClause}`;
        }
        return {sql, params: this.whereParams};
    }

    _execute() {
        if (this._executed) return;

        const {sql, params} = this._buildSql();

        if (this.logQueries) {
            console.log("SqliteResultsProxy SQL:", sql, "params:", params);
        }

        // Check query cache — reuse hydrated entities from an identical prior query
        const opts = this.hydrator ? this._effectiveHydrationOptions() : null;
        const cacheKey = this._queryCache ? `${sql}|${JSON.stringify(params)}|${opts?.depth}|${opts?.skipLists}` : null;
        if (cacheKey && this._queryCache.has(cacheKey)) {
            const cached = this._queryCache.get(cacheKey);
            this._rows = cached.rows;
            this._entities = [...cached.entities]; // shallow copy so JS filters don't mutate cache
            General.logDebug("HydrationProfile", ` CACHE HIT ${this.schemaName} (${this._entities.length} entities)`);
            // Still apply JS fallback filters on the copy
            if (this.jsFallbackFilters.length > 0) {
                this._entities = JsFallbackFilterEvaluator.apply(
                    this._entities, this.jsFallbackFilters, this.schemaName
                );
                if (this.limitClause != null) {
                    this._entities = this._entities.slice(0, this.limitClause);
                }
            }
            this._executed = true;
            return;
        }

        const t0 = Date.now();
        const rows = this.executeQuery(sql, params);
        this._rows = rows || [];
        const tQuery = Date.now();

        // Hydrate rows into entity-compatible objects
        if (this.hydrator) {
            const opts = this._effectiveHydrationOptions();
            this.hydrator.beginHydrationSession();
            try {
                // Batch-preload list properties to avoid N+1 queries (skip when lists aren't needed)
                let tPreload = tQuery;
                if (!opts.skipLists && this._rows.length > 0 && this.hydrator.batchPreloadLists) {
                    const parentUuids = this._rows.map(row => row.uuid).filter(u => u != null);
                    this.hydrator.batchPreloadLists(this.schemaName, parentUuids, opts.depth || 3);
                    tPreload = Date.now();
                }

                this._entities = this._rows.map(row =>
                    this.hydrator.hydrate(this.schemaName, row, opts)
                );
                const tHydrate = Date.now();

                const total = tHydrate - t0;
                if (total > 2000 && this._rows.length > 0) {
                    General.logDebug("HydrationProfile", ` ${this.schemaName} (${this._rows.length} rows, depth=${opts.depth}, skipLists=${opts.skipLists}): query=${tQuery - t0}ms, preload=${tPreload - tQuery}ms, hydrate=${tHydrate - tPreload}ms, total=${total}ms`);
                }
            } finally {
                this.hydrator.endHydrationSession();
            }
        } else {
            this._entities = this._rows;
        }

        // Store in query cache (before JS fallback, so cached entities are the full
        // hydrated set that JS filters can be applied to independently per card)
        if (cacheKey && this._queryCache) {
            this._queryCache.set(cacheKey, {rows: this._rows, entities: this._entities});
        }

        // Apply JS fallback filters for patterns that couldn't be translated to SQL
        if (this.jsFallbackFilters.length > 0) {
            const tFallbackStart = Date.now();
            this._entities = JsFallbackFilterEvaluator.apply(
                this._entities, this.jsFallbackFilters, this.schemaName
            );
            const tFallbackEnd = Date.now();

            if (tFallbackEnd - tFallbackStart > 1000) {
                General.logDebug("HydrationProfile", ` ${this.schemaName} JS fallback: ${tFallbackEnd - tFallbackStart}ms (${this.jsFallbackFilters.map(f => f.query?.substring(0, 60)).join('; ')})`);
            }

            // Apply limit after JS fallback (LIMIT was not in SQL because
            // JS fallbacks need to filter the full set first, then limit)
            if (this.limitClause != null) {
                this._entities = this._entities.slice(0, this.limitClause);
            }
        }

        this._executed = true;
    }

    _getEntities() {
        this._execute();
        return this._entities;
    }

    // ──── Entity creation ────

    createEntity(hydratedObj) {
        return new this.entityClass(hydratedObj);
    }

    getRawCollection() {
        if (!this._rawCollectionProxy) {
            this._rawCollectionProxy = new Proxy(this, RawCollectionProxyHandler);
        }
        return this._rawCollectionProxy;
    }

    // ──── Collection API ────

    getAt(index) {
        const entities = this._getEntities();
        if (index >= entities.length) return null;
        const obj = entities[index];
        return _.isNil(obj) ? null : this.createEntity(obj);
    }

    /**
     * Return count using SELECT COUNT(*) without hydrating any rows.
     * Use this when only the count is needed (e.g., dashboard card counts).
     * Falls back to full execution if JS fallback filters are present.
     */
    count() {
        if (this.jsFallbackFilters.length > 0) {
            this._execute();
            return this._entities.length;
        }
        const {sql, params} = this._buildSql();
        // Wrap in SELECT COUNT(*) FROM (...) to avoid assumptions about _buildSql format.
        // Strip LIMIT — count should return total matching rows, not capped by pagination.
        const innerSql = sql.replace(/\s+LIMIT\s+\d+$/i, '');
        const countSql = `SELECT COUNT(*) AS cnt FROM (${innerSql})`;
        const rows = this.executeQuery(countSql, params);
        return (rows && rows.length > 0) ? rows[0].cnt : 0;
    }

    getLength() {
        if (!this._executed) {
            this._execute();
        }
        return this._entities.length;
    }

    isEmpty() {
        return this.getLength() === 0;
    }

    forEach(callback, thisArg) {
        const entities = this._getEntities();
        return entities.forEach((obj, index) => {
            return callback(this.createEntity(obj), index, this);
        }, thisArg);
    }

    map(callback, thisArg) {
        const entities = this._getEntities();
        return entities.map((obj, index) => {
            return callback(this.createEntity(obj), index, this);
        }, thisArg);
    }

    mapInternal(callback, thisArg) {
        const entities = this._getEntities();
        return entities.map((obj, index) => {
            return callback(obj, index, this);
        }, thisArg);
    }

    filter(predicate, thisArg) {
        const entities = this._getEntities();
        return entities
            .map(obj => this.createEntity(obj))
            .filter(predicate, thisArg);
    }

    filterInternal(predicate, thisArg) {
        const entities = this._getEntities();
        return entities.filter(predicate, thisArg);
    }

    find(filterCallback, thisArg) {
        const entities = this._getEntities();
        for (let i = 0; i < entities.length; i++) {
            const entity = this.createEntity(entities[i]);
            const result = thisArg
                ? filterCallback.call(thisArg, entity, i, this)
                : filterCallback(entity, i, this);
            if (result) return entity;
        }
        return undefined;
    }

    some(callback, thisArg) {
        const entities = this._getEntities();
        return entities.some((obj, index) => {
            return callback(this.createEntity(obj), index, this);
        }, thisArg);
    }

    every(callback, [thisArg] = []) {
        const entities = this._getEntities();
        const everyFunc = (obj, index) => {
            return callback(this.createEntity(obj), index, this);
        };
        return _.isNil(thisArg)
            ? entities.every(everyFunc)
            : entities.every(everyFunc, [thisArg]);
    }

    slice(start, end) {
        const entities = this._getEntities();
        return entities.slice(start, end).map(obj => this.createEntity(obj));
    }

    join(separator) {
        const entities = this._getEntities();
        return entities.map(obj => this.createEntity(obj)).join(separator);
    }

    // ──── Aggregate functions ────

    max(property) {
        const col = camelToSnake(property);
        const {sql: baseSql, params} = this._buildSql();
        const sql = this.distinctColumns && this.distinctColumns.length > 0
            ? `SELECT MAX("${col}") as max_val FROM (${baseSql})`
            : baseSql.replace(/^SELECT t0\.\*/, `SELECT MAX(t0."${col}") as max_val`);
        const rows = this.executeQuery(sql, params);
        return rows && rows.length > 0 ? rows[0].max_val : undefined;
    }

    min(property) {
        const col = camelToSnake(property);
        const {sql: baseSql, params} = this._buildSql();
        const sql = this.distinctColumns && this.distinctColumns.length > 0
            ? `SELECT MIN("${col}") as min_val FROM (${baseSql})`
            : baseSql.replace(/^SELECT t0\.\*/, `SELECT MIN(t0."${col}") as min_val`);
        const rows = this.executeQuery(sql, params);
        return rows && rows.length > 0 ? rows[0].min_val : undefined;
    }

    sum(property) {
        const col = camelToSnake(property);
        const {sql: baseSql, params} = this._buildSql();
        const sql = this.distinctColumns && this.distinctColumns.length > 0
            ? `SELECT SUM("${col}") as sum_val FROM (${baseSql})`
            : baseSql.replace(/^SELECT t0\.\*/, `SELECT SUM(t0."${col}") as sum_val`);
        const rows = this.executeQuery(sql, params);
        return rows && rows.length > 0 ? (rows[0].sum_val || 0) : 0;
    }

    // ──── Materialization ────

    asArray() {
        return this._getEntities().map(obj => this.createEntity(obj));
    }

    materialiseArray() {
        // Compatibility with RealmResultsProxy
        return this.asArray();
    }

    // ──── Iterator ────

    [Symbol.iterator]() {
        const entities = this._getEntities();
        let index = 0;
        const self = this;
        return {
            next() {
                if (index < entities.length) {
                    return {value: self.createEntity(entities[index++]), done: false};
                }
                return {done: true};
            },
        };
    }

    // ──── Realm compatibility properties ────

    get optional() {
        return undefined;
    }

    get type() {
        return this.schemaName;
    }
}

export {SqliteResultsProxy, SqliteResultsProxyHandler};
export default SqliteResultsProxy;
