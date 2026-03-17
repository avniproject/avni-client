import BaseQueryBuilder from './BaseQueryBuilder';

/**
 * Realm implementation of QueryBuilder.
 * Builds up filter conditions and translates them to Realm .filtered() calls.
 *
 * All conditions added via builder methods are ANDed together.
 * Use .or(builder => ...) for OR groups.
 * Use .raw() as escape hatch for complex Realm-specific patterns (SUBQUERY, etc.).
 */
class RealmQueryBuilder extends BaseQueryBuilder {
    constructor(realmResults) {
        super();
        this._results = realmResults;
        this._filters = [];
        this._sortField = null;
        this._sortDescending = false;
        this._distinctField = null;
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
        const clauses = values.map(v => `${field} = "${v}"`);
        this._filters.push({type: 'literal', filter: `( ${clauses.join(' OR ')} )`});
        return this;
    }

    nonVoided() {
        this._filters.push({type: 'literal', filter: 'voided = false'});
        return this;
    }

    sizeGt(field, count) {
        this._filters.push({type: 'literal', filter: `${field}.@size > ${count}`});
        return this;
    }

    sizeEq(field, count) {
        this._filters.push({type: 'literal', filter: `${field}.@count == ${count}`});
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

    /**
     * OR group: pass a function that receives a fresh builder for each OR branch.
     * Example:
     *   .or(
     *     q => q.eq('encounterType.name', name),
     *     q => q.eq('encounterType.uuid', uuid)
     *   )
     */
    or(...branches) {
        const parts = branches.map(branchFn => {
            const sub = new RealmQueryBuilder(null);
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

    _buildFilterString() {
        const parts = [];
        for (const f of this._filters) {
            if (f.type === 'literal') {
                parts.push(f.filter);
            } else {
                // For the combined filter string used in OR groups,
                // inline the parameter values
                let s = f.filter;
                f.params.forEach((val, i) => {
                    const placeholder = `$${i}`;
                    if (typeof val === 'string') {
                        s = s.replace(placeholder, `"${val}"`);
                    } else if (val instanceof Date) {
                        s = s.replace(placeholder, val.toISOString());
                    } else {
                        s = s.replace(placeholder, String(val));
                    }
                });
                parts.push(s);
            }
        }
        return parts.join(' AND ');
    }

    _applyFilters(results) {
        for (const f of this._filters) {
            if (f.type === 'literal') {
                results = results.filtered(f.filter);
            } else {
                results = results.filtered(f.filter, ...f.params);
            }
        }
        return results;
    }

    _applyDistinct(results) {
        if (this._distinctField) {
            results = results.filtered(`TRUEPREDICATE DISTINCT(${this._distinctField})`);
        }
        return results;
    }

    _applySort(results) {
        if (this._sortField) {
            results = results.sorted(this._sortField, this._sortDescending);
        }
        return results;
    }

    _execute() {
        let results = this._results;
        results = this._applyFilters(results);
        results = this._applyDistinct(results);
        results = this._applySort(results);
        return results;
    }

    all() {
        return this._execute();
    }

    first() {
        const results = this._execute();
        return results.length > 0 ? results[0] : null;
    }

    count() {
        return this._execute().length;
    }
}

export default RealmQueryBuilder;
