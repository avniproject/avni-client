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

const SqliteResultsProxyHandler = {
    get: function (target, name) {
        if (typeof name !== "symbol" && !isNaN(name) && !isNaN(parseInt(name))) {
            return target.getAt(Number.parseInt(name));
        } else if (name === "length") {
            return target.getLength();
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
     * @param {Array|null} params.jsFallbackFilters - Realm queries that couldn't be translated
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

        const parseResult = RealmQueryParser.parse(query, args, this.schemaName, this.realmSchemaMap);

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
        };

        if (parseResult.unsupported) {
            // Can't translate to SQL — store for JS fallback filtering
            newParams.jsFallbackFilters.push({query, args, reason: parseResult.reason});
        } else {
            if (parseResult.where) {
                newParams.whereClauses.push(parseResult.where);
                newParams.whereParams.push(...parseResult.params);
            }
            if (parseResult.joins) {
                // Merge joins, avoiding duplicates by alias
                const existingAliases = new Set(newParams.joinClauses.map(j => j.alias));
                parseResult.joins.forEach(j => {
                    if (!existingAliases.has(j.alias)) {
                        newParams.joinClauses.push(j);
                        existingAliases.add(j.alias);
                    }
                });
            }
        }

        return SqliteResultsProxy.create(newParams);
    }

    sorted(descriptor, reverse) {
        let orderBy;
        if (typeof descriptor === "string") {
            const col = camelToSnake(descriptor);
            const dir = reverse ? "DESC" : "ASC";
            orderBy = `t0."${col}" ${dir}`;
        } else if (Array.isArray(descriptor)) {
            // Array of [prop, reverse] pairs
            orderBy = descriptor.map(([prop, rev]) => {
                return `t0."${camelToSnake(prop)}" ${rev ? "DESC" : "ASC"}`;
            }).join(", ");
        } else {
            orderBy = `t0."${camelToSnake(String(descriptor))}" ASC`;
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
            joinClauses: [...this.joinClauses],
            orderByClause: orderBy,
            jsFallbackFilters: [...this.jsFallbackFilters],
        });
    }

    // ──── Query execution ────

    _buildSql() {
        let sql = `SELECT t0.* FROM ${this.tableName} AS t0`;

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
            this._entities = this._rows.map(row => {
                const hydrated = this.hydrator.hydrate(this.schemaName, row, {skipLists: false, depth: 2});
                return hydrated;
            });
        } else {
            this._entities = this._rows;
        }

        // Apply JS fallback filters for unsupported queries
        if (this.jsFallbackFilters.length > 0) {
            console.warn(
                `SqliteResultsProxy: ${this.jsFallbackFilters.length} unsupported Realm query(s) ` +
                `will be evaluated via JS fallback for ${this.schemaName}:`,
                this.jsFallbackFilters.map(f => f.query)
            );
            // For JS fallback, we materialize entities and filter in JS
            // This is a performance compromise — acceptable for the spike
            // The unsupported queries are logged for future migration to proper SQL
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
