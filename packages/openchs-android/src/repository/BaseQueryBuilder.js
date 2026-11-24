/**
 * Abstract query builder interface. Backend-specific implementations
 * (RealmQueryBuilder, SqliteQueryBuilder) translate these method calls
 * into the appropriate query syntax.
 *
 * Usage:
 *   repository.query()
 *     .nonVoided()
 *     .eq('subjectType.uuid', subjectTypeUUID)
 *     .sorted('name')
 *     .all()
 */
class BaseQueryBuilder {
    eq(field, value) { throw new Error("eq() not implemented"); }
    neq(field, value) { throw new Error("neq() not implemented"); }
    gt(field, value) { throw new Error("gt() not implemented"); }
    gte(field, value) { throw new Error("gte() not implemented"); }
    lt(field, value) { throw new Error("lt() not implemented"); }
    lte(field, value) { throw new Error("lte() not implemented"); }
    between(field, from, to) { throw new Error("between() not implemented"); }
    isNull(field) { throw new Error("isNull() not implemented"); }
    isNotNull(field) { throw new Error("isNotNull() not implemented"); }
    contains(field, value, options) { throw new Error("contains() not implemented"); }
    in(field, values) { throw new Error("in() not implemented"); }
    nonVoided() { throw new Error("nonVoided() not implemented"); }
    distinct(field) { throw new Error("distinct() not implemented"); }
    sorted(field, descending) { throw new Error("sorted() not implemented"); }
    sizeGt(field, count) { throw new Error("sizeGt() not implemented"); }
    sizeEq(field, count) { throw new Error("sizeEq() not implemented"); }
    raw(filterString, ...params) { throw new Error("raw() not implemented"); }

    all() { throw new Error("all() not implemented"); }
    first() { throw new Error("first() not implemented"); }
    count() { throw new Error("count() not implemented"); }
}

export default BaseQueryBuilder;
