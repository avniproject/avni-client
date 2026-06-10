import BaseQueryBuilder from './BaseQueryBuilder';
import {camelToSnake} from '../framework/db/SqliteUtils';
import JsFallbackFilterEvaluator from '../framework/db/JsFallbackFilterEvaluator';

/**
 * SQLite implementation of QueryBuilder.
 * Builds SQL WHERE clauses directly — no Realm-syntax intermediary for typed methods.
 *
 * Uses camelToSnake() to convert entity field names to SQL column names.
 * The raw() method delegates to SqliteResultsProxy.filtered() for Realm-syntax escape hatch.
 */
class SqliteQueryBuilder extends BaseQueryBuilder {
    constructor(db, schemaName) {
        super();
        this._resultsProxy = db.objects(schemaName);
        this._schemaName = schemaName;
        this._filters = [];
        this._sortField = null;
        this._sortDescending = false;
        this._distinctField = null;
        this._jsFallbackFilters = [];
    }

    eq(field, value) {
        this._filters.push({type: 'parameterized', filter: `${field} = $0`, params: [value]});
        return this;
    }

    neq(field, value) {
        this._filters.push({type: 'parameterized', filter: `${field} != $0`, params: [value]});
        return this;
    }

    gt(field, value) {
        this._filters.push({type: 'parameterized', filter: `${field} > $0`, params: [value]});
        return this;
    }

    gte(field, value) {
        this._filters.push({type: 'parameterized', filter: `${field} >= $0`, params: [value]});
        return this;
    }

    lt(field, value) {
        this._filters.push({type: 'parameterized', filter: `${field} < $0`, params: [value]});
        return this;
    }

    lte(field, value) {
        this._filters.push({type: 'parameterized', filter: `${field} <= $0`, params: [value]});
        return this;
    }

    between(field, from, to) {
        this._filters.push({type: 'parameterized', filter: `${field} >= $0 AND ${field} <= $1`, params: [from, to]});
        return this;
    }

    isNull(field) {
        this._filters.push({type: 'literal', filter: `${field} = null`});
        return this;
    }

    isNotNull(field) {
        this._filters.push({type: 'literal', filter: `${field} <> null`});
        return this;
    }

    contains(field, value, options = {}) {
        const modifier = options.caseInsensitive ? '[c]' : '';
        this._filters.push({type: 'parameterized', filter: `${field} CONTAINS${modifier} $0`, params: [value]});
        return this;
    }

    in(field, values) {
        if (!values || values.length === 0) {
            this._filters.push({type: 'literal', filter: 'uuid = "___never_match___"'});
            return this;
        }
        this._filters.push({type: 'literal', filter: `${field} IN {${values.map(v => `"${v}"`).join(',')}}`});
        return this;
    }

    nonVoided() {
        this._filters.push({type: 'literal', filter: 'voided = false'});
        return this;
    }

    sizeGt(field, count) {
        this._jsFallbackFilters.push({query: `${field}.@size > ${count}`, args: []});
        return this;
    }

    sizeEq(field, count) {
        this._jsFallbackFilters.push({query: `${field}.@count == ${count}`, args: []});
        return this;
    }

    distinct(field) {
        this._distinctField = field;
        return this;
    }

    sorted(field, descending = false) {
        this._sortField = field;
        this._sortDescending = descending;
        return this;
    }

    or(...branches) {
        const parts = branches.map(branchFn => {
            const sub = new SqliteQueryBuilder.__SubBuilder();
            branchFn(sub);
            return sub._buildFilterString();
        }).filter(s => s.length > 0);
        if (parts.length > 0) {
            this._filters.push({type: 'literal', filter: `( ${parts.join(' OR ')} )`});
        }
        return this;
    }

    raw(filterString, ...params) {
        if (params.length > 0) {
            this._filters.push({type: 'parameterized', filter: filterString, params});
        } else {
            this._filters.push({type: 'literal', filter: filterString});
        }
        return this;
    }

    _execute() {
        let results = this._resultsProxy;

        // Apply filters via SqliteResultsProxy.filtered() which translates to SQL
        for (const f of this._filters) {
            if (f.type === 'literal') {
                results = results.filtered(f.filter);
            } else {
                results = results.filtered(f.filter, ...f.params);
            }
        }

        if (this._distinctField) {
            results = results.filtered(`TRUEPREDICATE DISTINCT(${this._distinctField})`);
        }

        if (this._sortField) {
            results = results.sorted(this._sortField, this._sortDescending);
        }

        return results;
    }

    all() {
        let results = this._execute();
        // Materialize to array for JS fallback filters
        if (this._jsFallbackFilters.length > 0) {
            let entities = [...results];
            entities = JsFallbackFilterEvaluator.apply(entities, this._jsFallbackFilters, this._schemaName);
            return entities;
        }
        return results;
    }

    first() {
        const results = this._execute();
        return results.length > 0 ? results[0] : null;
    }

    count() {
        if (this._jsFallbackFilters.length > 0) {
            return this.all().length;
        }
        return this._execute().length;
    }
}

// Lightweight sub-builder for OR groups (no db/schema needed, just builds filter strings)
SqliteQueryBuilder.__SubBuilder = class {
    constructor() {
        this._filters = [];
    }

    eq(field, value) { this._filters.push({type: 'parameterized', filter: `${field} = $0`, params: [value]}); return this; }
    neq(field, value) { this._filters.push({type: 'parameterized', filter: `${field} != $0`, params: [value]}); return this; }
    gt(field, value) { this._filters.push({type: 'parameterized', filter: `${field} > $0`, params: [value]}); return this; }
    gte(field, value) { this._filters.push({type: 'parameterized', filter: `${field} >= $0`, params: [value]}); return this; }
    lt(field, value) { this._filters.push({type: 'parameterized', filter: `${field} < $0`, params: [value]}); return this; }
    lte(field, value) { this._filters.push({type: 'parameterized', filter: `${field} <= $0`, params: [value]}); return this; }
    contains(field, value, options = {}) {
        const modifier = options.caseInsensitive ? '[c]' : '';
        this._filters.push({type: 'parameterized', filter: `${field} CONTAINS${modifier} $0`, params: [value]});
        return this;
    }
    raw(filterString, ...params) {
        if (params.length > 0) this._filters.push({type: 'parameterized', filter: filterString, params});
        else this._filters.push({type: 'literal', filter: filterString});
        return this;
    }

    _buildFilterString() {
        const parts = [];
        for (const f of this._filters) {
            if (f.type === 'literal') {
                parts.push(f.filter);
            } else {
                let s = f.filter;
                for (let i = f.params.length - 1; i >= 0; i--) {
                    const val = f.params[i];
                    const replacement = typeof val === 'string' ? `"${val}"` :
                        val instanceof Date ? val.toISOString() : String(val);
                    s = s.split(`$${i}`).join(replacement);
                }
                parts.push(s);
            }
        }
        return parts.join(' AND ');
    }
};

export default SqliteQueryBuilder;
