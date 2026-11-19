# Rule Engine — SQLite Compatibility Guide

## Overview

Rules receive `params.db` which provides the same API whether the backend is Realm or SQLite. Most rules run unchanged. A few query shapes do not: they show Error on SQLite, or give a different number. They are listed under [Not supported — rewrite the rule](#not-supported--rewrite-the-rule), and every live card that used one in Oct 2026 is listed in #2210.

## Supported Query Patterns

### Direct SQL Translation (Fast)

| Pattern | Example | Notes |
|---|---|---|
| Simple filter | `db.objects('Individual').filtered('voided = false')` | Translates directly to SQL WHERE |
| Parameterised filter | `.filtered('uuid = $0', someUuid)` | Safe parameter binding |
| AND/OR/NOT | `.filtered('voided = false AND name CONTAINS[c] $0', text)` | Full boolean logic |
| Comparison operators | `=`, `==`, `!=`, `<>`, `<`, `>`, `<=`, `>=` | All supported |
| String operators | `CONTAINS`, `BEGINSWITH`, `ENDSWITH`, `LIKE` with `[c]` | Case-insensitive supported |
| Dot-notation (FK) | `.filtered('subjectType.name = $0', name)` | Generates SQL JOINs |
| Deep dot paths | `.filtered('programEnrolment.individual.voided = false')` | Multi-level JOINs |
| IN clause | `.filtered('uuid IN {"a", "b", "c"}')` | Translated to SQL IN |
| IN with an array parameter | `.filtered('uuid IN $0', uuids)` | The array is bound as one JSON parameter, so any list size works. An empty array matches nothing |
| Chained .filtered() | `.filtered(q1).filtered(q2)` | Combined with AND |
| .sorted() | `.sorted('name')`, `.sorted('registrationDate', true)` | SQL ORDER BY |
| .length | `db.objects('AddressLevel').length` | Row count |
| [index] access | `results[0].name` | Indexed entity access |

### JS Fallback (Functional, Slower)

These patterns are recognised by the parser. When it cannot translate them to SQL, they are routed to a JavaScript post-filter that runs after SQL hydration. They work correctly but are slower because the full result set is hydrated first.

| Pattern | Example | Performance Note |
|---|---|---|
| SUBQUERY | `.filtered('SUBQUERY(enrolments, $enrolment, ...).@count > 0')` | Most shapes translate to SQL `IN` / `EXISTS` / `json_each`; the rest hydrate all matching rows and filter in JS |
| Nested SUBQUERY | `SUBQUERY($enrolment.encounters, $encounter, ...).@count > 0` | Same — works at any nesting depth |
| TRUEPREDICATE DISTINCT | `.filtered('TRUEPREDICATE DISTINCT(field)')` | Post-hydration deduplication |
| @count / @size | `.filtered('listProp.@count > 0')` | Collection size check in JS. Any comparison operator works (`=`, `==`, `!=`, `<>`, `<`, `>`, `<=`, `>=`). |
| ANY | `.filtered('ANY listProp.field = value')` | Quantifier over list |
| `limit(N)` | `.filtered('voided = false limit(50)')` | Inline result slicing applied after the other fallback filters |

When a rule's JS-fallback path is hot enough to matter, prefer the `params.db.exec*` SQL fast path documented in [`RuleSqlMigrationGuide.md`](./RuleSqlMigrationGuide.md) — the count + line-list pattern collapses minutes of hydration into milliseconds for count-only cards.

### Not supported — rewrite the rule

The JS fallback refuses a query it cannot evaluate (`UnsupportedRealmQueryError`), so the card shows Error rather than a wrong number. These shapes are rare in live rules, so they are rewritten rather than added to the platform.

| Shape | Example | On SQLite | Rewrite |
|---|---|---|---|
| Aggregate | `encounters.@max.encounterDateTime`, `@min`, `@sum`, `@avg` | Error | Narrow the query without it, then pick the value in JS |
| `ALL` / `NONE` | `ALL enrolments.voided == false` | Error | `SUBQUERY(… AND NOT <cond>).@count == 0` |
| `@links` | `@links.@count > 0` | Error | A forward `SUBQUERY(...).@count > 0` on the parent side |
| Count against count | `SUBQUERY(…).@count == SUBQUERY(…).@count` | Error | Ask the question as a single count, e.g. "every PNC lacks Hb" is `SUBQUERY(… AND SUBQUERY($e.observations, …).@count > 0).@count == 0` |
| No space beside a bracket | `…))OR (…` | Error | Add the space |
| Realm date literal | `registrationDate >= 2026-09-01@00:00:00` | Wrong number: bound as `2026` | Pass a `Date` as `$0` |
| First item of a list | `ind.enrolments[0]` | Different subjects | Realm keeps the order the phone first received records; SQLite returns table order. Pick the item by date or program |

### JS Post-Filter on Results (Common in Rules)

Rules frequently chain `.filter()` (JS Array method) after `.filtered()` (Realm query):

```javascript
// SQL narrows the set, JS does complex logic
db.objects('Individual')
    .filtered('voided = false')                              // → SQL
    .filter(ind => ind.subjectType.name === 'Participant')   // → JS on hydrated entities
```

This works on both backends. The `.filtered()` runs as SQL, `.filter()` runs on hydrated JS objects.

### Observation JSON Search

Observations are stored as JSON text columns in SQLite. Patterns like:

```javascript
db.objects('Individual').filtered(
    "SUBQUERY(observations, $observation, $observation.valueJSON contains 'some-uuid').@count > 0"
)
```

Translate to SQL with `json_each` over the observations column. Shapes the translator cannot handle fall back to JS.

For simple observation column searches outside SUBQUERY:

```javascript
.filtered("observations.valueJSON contains[c] 'keyword'")
```

This translates directly to SQL `LIKE` on the JSON text column.

## Entity Methods

Rules access methods on hydrated entities. These work because SQLite entities are hydrated with all properties:

| Method | Works | Notes |
|---|---|---|
| `individual.getObservationValue(uuid)` | Yes | Reads from hydrated observations |
| `individual.getObservationReadableValue(uuid)` | Yes | |
| `enrolment.findLatestObservationInEntireEnrolment(name)` | Yes | Traverses encounters |
| `individual.nonVoidedEncounters()` | Yes | Returns hydrated encounter list |
| `individual.getEncounters()` | Yes | |
| `enrolment.findObservation(name)` | Yes | |

## Performance Characteristics

| Operation | SQLite (1K individuals) | Notes |
|---|---|---|
| UUID lookup | <5ms | Direct SQL index scan |
| IN clause (5 UUIDs) | ~85ms | SQL IN with parameter binding |
| Simple .length | <1ms | SQL COUNT |
| Filtered + FK access (1K rows) | ~300-340ms | Hydration dominates |
| SUBQUERY (JS fallback, 1K rows) | ~330ms | Full hydration + JS filter |
| Deep property chain (100 rows) | ~520ms | Multi-level FK resolution |
| Full scan + map (4K rows) | ~620ms | Large result set hydration |

On mobile device, multiply by 3-5x.

## Performance Recommendations

1. **Use `.filtered()` to narrow results before `.filter()`** — SQL filtering is fast, JS filtering requires full hydration of all rows
2. **Avoid `db.objects('Individual')` without a filter** — scans entire table
3. **Return counts when possible** — `results.length` is cheaper than iterating results
4. **Prefer parameterised queries** — `.filtered('uuid = $0', uuid)` over `.filtered('uuid = "' + uuid + '"')`
5. **IN clause is efficient** — use `field IN {"a", "b"}`, or `field IN $0` with an array, instead of chained OR for multiple values

**Table statistics.** The app runs `PRAGMA optimize` when the database opens and after each sync. Without statistics, SQLite searched child tables by `voided` inside a correlated subquery such as `SUBQUERY(…).@count == 0`, and a card could take minutes on a large catchment.

## Monitoring

Rule execution times >50ms are logged with tag `[RulePerf]`. Filter device logs:

```
adb logcat | grep RulePerf
```

Log format:
- Eval rules: `Eval rule [decision:formUuid] took 150ms`
- Bundle rules: `Bundle rule ruleName (ruleUuid) took 200ms for entityName`
