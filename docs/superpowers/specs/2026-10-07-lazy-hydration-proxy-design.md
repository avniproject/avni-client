# Lazy hydration proxy for SQLite reads — design

Card: avni-client#2080. Branch: `18.0`. Date: 7 Oct 2026.
Background: avni-client#2019 (spike), #2061 (lazy lists), #2075 (count in SQL, 18.1 only), #2105, #2151; avni-product-ops `analysis/sqlite-rollout-readiness/gate2_stories.md`, `qa/findings/2026-09-30-akrsp-slow-device-sqlite.md`, `context/decisions-log.md` (24 Aug).

## Goal

Organisations are being moved from Realm to SQLite from mid-October, with every active organisation targeted by mid-December. On SQLite, any read of a `db.objects(X)` result — including `.length` — first builds every row as a plain object to depth 3: every to-one reference followed three hops, every observations column parsed, lists pre-loaded two levels. Rules that run JavaScript over rows pay this on every card. Measured: AKRSP's WIMC card 233 s on SQLite against 13 s on Realm; JSCS cards 30–110 s; SQL is ~2% of that time.

Make SQLite load a row's detail only when something reads it, so organisations migrate without rewriting their rules. Rules are rewritten only for what is still slow after this.

## Requirements

- Every card number, list and line-list is identical to today's SQLite eager result, including row order.
- Realm is untouched.
- `.length` followed by indexing fetches the rows once.
- Reading the same reference or list across many rows costs one query per level, not one per row.
- Nothing in the query cache holds a wrong value.
- A read that fails surfaces at the read, and a later read retries.
- Identity: Realm 12 gives none (`results[0] === results[0]` and `e1.p === e2.p` for the same row are both `false`, checked 7 Oct), and model classes wrap afresh on every read, so rules can only compare by `uuid`. Matching uuids is the requirement; object reuse within a group is an efficiency, not a guarantee.

Not in scope: rule-evaluation cost that exists on both backends (#2074); SQL translation of more predicates (#1978, #2076, #2077); count paths (#2075).

## Design

A read-only, batch-fetching lazy proxy in the Hibernate style (lazy to-one proxies, lazy collections, `@BatchSize`), built on the getter mechanism the lazy lists already use. No dirty checking or write-behind: saving stays as it is.

### Batch group

A batch group is a set of raw rows of one schema loaded together:
- the rows a query returned;
- the rows loaded to answer one reference across a group;
- the rows loaded to answer one list across a group.

It holds the raw rows exactly as SQLite returned them (foreign-key uuid columns included), a memo of built objects keyed by uuid, and, per reference or list property once first read, a map from foreign-key or parent uuid to built objects in a child group.

### Building a row

Rows are built on access, not up front. A built row is a plain object, as `EntityHydrator.hydrate()` produces now, except:
- scalars are converted immediately;
- to-one references are getters; a null foreign key is `null` without a getter;
- lists and embedded JSON columns (observations and the like) are getters.

Getters behave like `EntityHydrator._defineLazyList` today: memoise once resolved; a throw leaves the property unresolved so the next read retries; a setter allows assignment. Model classes read through `this.that[prop]` and need no change.

Each built object keeps its raw row in a non-enumerable slot, used by `flatten()` (see Writes).

### References

The first read of a reference property on any row of a group:
1. collects the distinct foreign-key uuids from all raw rows of the group (in memory, no query);
2. serves any held in the reference-data cache from there;
3. loads the rest with one `SELECT * … WHERE uuid IN (…)`, chunked at 999;
4. makes those rows a child group, so their own references and lists batch the same way;
5. answers every row's getter from the resulting map.

A missing referenced row gives today's `{uuid}` placeholder, not an error. A back-reference from a child to the parent that loaded it (for example `encounter.individual` reached through `individual.encounters`) returns the parent's built object without a query.

### Lists

The first read of a list property on any row of a group runs one `SELECT * FROM child WHERE fk IN (…)` over all the group's uuids — the same SQL `batchPreloadLists` runs today, so rows come back in today's order — groups the rows by parent into a child group, and gives each row its slice. Children are built as they are iterated. `EXPLICIT_LIST_FK_OVERRIDES` still apply; JSON uuid-array lists resolve through the reference path.

### Observations and concepts

Embedded JSON columns are parsed on first read and memoised. An observation's `concept` comes from the Concept reference-data cache. Concept is added to the caches built lazily on first need (today it is only built after a sync), so a rule run after an app restart does not query concepts per row; a concept missing from the cache is loaded once and added.

### Results proxy

- `_execute()` runs only the SQL and creates the group.
- `.length` is the row count; nothing is built.
- `[i]`, iteration, `map`, `filter`, `find`, `slice` and the raw-collection view build rows as they reach them.
- JS fallback filters run on built rows and trigger only the getters they read.
- `count()`, `max`, `min`, `sum`, `distinctValues` are unchanged.

### Options

`depth`, `skipLists` and `listsToInclude` no longer affect results on the lazy path; `withHydration(...)` callers keep working. Sync's shallow mode uses the lazy path. Reference data built at boot or after sync stays eager and cached.

### Writes

`SqliteProxy.create` → `flatten()` reads each property present on the object. For a reference not yet loaded, `flatten()` writes the foreign-key uuid from the raw row and does not trigger the load. Loaded or assigned references, observations and JSON-array lists are read as today. Child lists are not written through the parent row. The mandatory-field check in `create` is unchanged.

### Query cache

The cache holds the group: raw rows plus whatever has been built. Values only fill in from the same rows. The key drops `depth` and the list options on the lazy path.

### Errors

Dashboard rules and line-list functions already run inside try/catch that records failed rules (`RuleEvaluationService` around `:1087`, `executeLineListFunction`). List screens that render rows are the new exposure; the realistic failure is the database being swapped during a backend switch, which is checked explicitly.

### Fallback

No runtime switch. A user with a problem on SQLite is moved back to Realm by removing them from the SQLite Migration group (`SqliteMigrationService.computeDesiredBackend`), the existing mechanism for any SQLite problem.

Today's eager path stays in the code during the rollout only as the reference the parity tests compare against. It is not reachable at runtime. Each piece of it kept for this reason carries a one-line comment to remove it once lazy hydration has proven out in the field.

## Delivery

One change on `18.0`, built in full before release: batch groups, lazy rows, lazy batched references and lists, lazy observations, the Concept cache on first need, `flatten()` handling, and the eager path kept as the test reference. It is released in an 18.0.x patch after the checks under Testing pass; the version is set by the release plan.

It covers the AKRSP pattern, #2151's per-row approval reads, `.length` and indexing, search, drill-downs, #2105's F9, and the many-parents list case.

## Testing

During development:
- Unit tests with a mocked query runner that counts queries: `.length` builds nothing; N rows reading a reference cost one query, nested reads one more; one query per list level; a back-reference needs no query; null foreign key; missing row placeholder; a failed getter retries; the setter works; observations parsed only when read; concepts from cache; `flatten()` does not load unread references.

Once development is done, and before release, run by us:
- Parity sweep on a real SQLite database: for every schema and row, every property read lazily deep-equals the eager result, list order included; the same for JS fallback filter results.
- Rule parity on the JSCS 32k snapshot: the organisation's report-card rules in both modes give identical card numbers and line-list uuids.
- On-device: JSCS (Facilities, Total Screened, search) and AKRSP (WIMC card open, first card after start), comparing Realm, SQLite eager and SQLite lazy in one sitting. `HydrationProfile` gains query and rows-built counters.
