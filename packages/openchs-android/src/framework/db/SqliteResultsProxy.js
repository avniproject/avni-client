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
import RealmQueryParser, {camelToSnake, schemaNameToTableName} from "./RealmQueryParser";
import JsFallbackFilterEvaluator from "./JsFallbackFilterEvaluator";

const SqliteResultsProxyHandler = {
    get: function (target, name, receiver) {
        if (typeof name !== "symbol" && !isNaN(name) && !isNaN(parseInt(name))) {
            return target.getAt(Number.parseInt(name));
        } else if (name === "length") {
            return target.getLength();
        } else if (name === "realmCollection") {
            // Return the Proxy wrapper (receiver), not the raw target,
            // so getUnderlyingRealmCollection() returns an object with
            // Proxy-intercepted length/index access.
            return receiver;
        }
        return Reflect.get(...arguments);
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
     * @param {string|null} params.orderByClause - ORDER BY fragment
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
                    orderByClause = null,
                    jsFallbackFilters = [],
                    limitClause = null,
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
        this.orderByClause = orderByClause;
        this.jsFallbackFilters = [...jsFallbackFilters];
        this.limitClause = limitClause;

        // Cached results
        this._rows = null;
        this._entities = null;
        this._executed = false;

        this.logQueries = false;
    }

    setLogQueries(value) {
        this.logQueries = value;
    }

    // ──── Chainable query builders ────

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
            orderByClause: this.orderByClause,
            jsFallbackFilters: [...this.jsFallbackFilters],
            limitClause: this.limitClause,
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
            const col = resolveOrderProp(descriptor);
            const dir = reverse ? "DESC" : "ASC";
            orderBy = `${col} ${dir}`;
        } else if (Array.isArray(descriptor)) {
            orderBy = descriptor.map(([prop, rev]) => {
                return `${resolveOrderProp(prop)} ${rev ? "DESC" : "ASC"}`;
            }).join(", ");
        } else {
            orderBy = `${resolveOrderProp(String(descriptor))} ASC`;
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
            orderByClause: orderBy,
            jsFallbackFilters: [...this.jsFallbackFilters],
            limitClause: this.limitClause,
        });
    }

    // ──── Query execution ────

    _buildSql() {
        // Use DISTINCT when JOINs are present to avoid duplicate parent rows.
        // In Realm, .filtered() on an object type always returns unique objects.
        // With SQL JOINs, a parent with multiple matching children would appear
        // multiple times without DISTINCT.
        const distinct = this.joinClauses.length > 0 ? "DISTINCT " : "";
        let sql = `SELECT ${distinct}t0.* FROM ${this.tableName} AS t0`;

        // JOINs
        for (const join of this.joinClauses) {
            sql += ` LEFT JOIN ${join.table} AS ${join.alias} ON ${join.on}`;
        }

        // WHERE
        if (this.whereClauses.length > 0) {
            sql += ` WHERE ${this.whereClauses.join(" AND ")}`;
        }

        // ORDER BY
        if (this.orderByClause) {
            sql += ` ORDER BY ${this.orderByClause}`;
        }

        // LIMIT — only when there are no JS fallback filters.
        // If JS fallbacks exist, they may further reduce results,
        // and the LIMIT should apply to the final set (Realm semantics).
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

        const rows = this.executeQuery(sql, params);
        this._rows = rows || [];

        // Hydrate rows into entity-compatible objects
        if (this.hydrator) {
            this.hydrator.beginHydrationSession();
            try {
                // Batch-preload list properties to avoid N+1 queries
                if (this._rows.length > 0 && this.hydrator.batchPreloadLists) {
                    const parentUuids = this._rows.map(row => row.uuid).filter(u => u != null);
                    this.hydrator.batchPreloadLists(this.schemaName, parentUuids);
                }

                this._entities = this._rows.map(row =>
                    this.hydrator.hydrate(this.schemaName, row, {skipLists: false, depth: 3})
                );
            } finally {
                this.hydrator.endHydrationSession();
            }
        } else {
            this._entities = this._rows;
        }

        // Apply JS fallback filters for patterns that couldn't be translated to SQL
        if (this.jsFallbackFilters.length > 0) {
            this._entities = JsFallbackFilterEvaluator.apply(
                this._entities, this.jsFallbackFilters, this.schemaName
            );

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

    // ──── Collection API ────

    getAt(index) {
        const entities = this._getEntities();
        if (index >= entities.length) return null;
        const obj = entities[index];
        return _.isNil(obj) ? null : this.createEntity(obj);
    }

    getLength() {
        // For length, we can optimize with a COUNT query if not yet executed
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
        const sql = baseSql.replace(/^SELECT t0\.\*/, `SELECT MAX(t0."${col}") as max_val`);
        const rows = this.executeQuery(sql, params);
        return rows && rows.length > 0 ? rows[0].max_val : undefined;
    }

    min(property) {
        const col = camelToSnake(property);
        const {sql: baseSql, params} = this._buildSql();
        const sql = baseSql.replace(/^SELECT t0\.\*/, `SELECT MIN(t0."${col}") as min_val`);
        const rows = this.executeQuery(sql, params);
        return rows && rows.length > 0 ? rows[0].min_val : undefined;
    }

    sum(property) {
        const col = camelToSnake(property);
        const {sql: baseSql, params} = this._buildSql();
        const sql = baseSql.replace(/^SELECT t0\.\*/, `SELECT SUM(t0."${col}") as sum_val`);
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
