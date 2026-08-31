# Sync pagination: why `Page` costs us a full COUNT, and what `Slice` fixes

Analysis from 2026-08-28, prerelease, org **JSCS**, user `mahanew4@jscs`
(46,782 subjects / 106,148 program encounters).

> **Scope of this document.** It is kept for the *measurements* — the
> `pg_stat_statements` breakdown, the RDS metrics and the New Relic percentiles.
> For the design and the implementation plan, **avniproject/avni-client#2096 is the
> source of truth**; @himeshr has since corrected several points that were wrong in
> the "The fix" section here, and those corrections are noted inline below.

## Summary

Every transactional sync pull uses Spring Data `Page`, which forces a
`COUNT(*)` over the entire scope-filtered result set in addition to
fetching one page of rows. On a cold cache that count dominates: we
measured the **same query** taking anywhere from **2.5 s to 507 s**.

A `Slice`-returning endpoint already exists server-side (`/programEncounter/v2`)
and does not run the count. The client cannot use it today because its
paging loop is driven by `totalPages`, which only a `Page` provides.

Fixing this spans both repos.

## Evidence

Server-side timings for a single endpoint,
`GET /programEncounter?programEncounterTypeUuid=f599f393…` ("Base screening",
35,374 rows, `lastModifiedDateTime=1900-01-01`, `size=1000`):

| Time (UTC) | page | Server time | Outcome |
|---|---|---:|---|
| 05:43:12 | 0 | 62,558 ms | client timeout (60 s) |
| 05:47:23 | 0 | **59,530 ms** | succeeded — by 0.47 s |
| 05:47:32 → 05:51:22 | 1–35 | **1,300–3,800 ms each** | all fine |
| 06:06:30 | 0 | 2,464 ms | warm |
| 06:37:24 | 0 | 140,675 ms | ALB 504 |
| 06:49:38 | 0 | 367,441 ms | ALB 504 |
| 06:59:16 | 0 | **507,147 ms** | ALB 504 |
| 07:03:27 | 0 | 267,929 ms | succeeded |
| 07:04:57 | 1 | 88,232 ms | |
| 07:05:22 | 2 | 8,342 ms | |
| 07:05:41+ | 3–35 | ~1,300 ms each | |

**Page 0 is 40–400× more expensive than every subsequent page**, for an
identical amount of returned data (1000 rows). Pages 1..n differ from page 0
only in that the count result is already cached.

The database was **not** resource-constrained during any of this:

| RDS metric (`prerelease-db-20260804`, db.t4g.medium) | Value |
|---|---|
| CPUUtilization | 11–26% |
| CPUCreditBalance | 574–576 (full, never throttled) |
| CPUSurplusCreditBalance | 0 |
| FreeableMemory | 1.7–2.0 GB free of 4 GB |
| ReadLatency | 0.6–7 ms |

So this is not instance sizing, IOPS, or memory pressure. It is work the
query plan is being asked to do.

## Mechanism

### Server

`ProgramEncounterController` exposes both shapes:

```java
@RequestMapping(value = "/programEncounter", method = RequestMethod.GET)
public CollectionModel<EntityModel<ProgramEncounter>> getProgramEncountersByOperatingIndividualScope(...) {
    return wrap(scopeBasedSyncService.getSyncResultsBySubjectTypeRegistrationLocation(...));   // Page
}

@RequestMapping(value = "/programEncounter/v2", method = RequestMethod.GET)
public SlicedResources<EntityModel<ProgramEncounter>> getProgramEncountersByOperatingIndividualScopeAsSlice(...) {
    return wrap(scopeBasedSyncService.getSyncResultsBySubjectTypeRegistrationLocationAsSlice(...)); // Slice
}
```

Spring Data semantics:

- **`Page<T>`** — runs the data query (`LIMIT size OFFSET n`) **and** a second
  `SELECT COUNT(*)` over the *whole* predicate, so it can populate
  `totalElements` / `totalPages`. The count cannot use the `LIMIT`; it must
  evaluate every matching row.
- **`Slice<T>`** — runs only the data query, fetching `size + 1` rows. If
  `size + 1` come back there is a next slice. No count, no full evaluation.

For a cold, unbounded pull (`lastModifiedDateTime = 1900-01-01`) over a
scope-filtered join, that count is the entire cost.

### Client

`ConventionalRestClient.fireRequest` drives paging from `totalPages`:

```js
const page = response["page"];
await processResponse(response, 0);
onGetOfFirstPage(entityMetadata.entityName, page);

const chainedRequests = new ChainedRequests();
_.range(1, page.totalPages, 1)
    .forEach((pageNumber) => chainedRequests.push(chainedRequests.get(
        endpoint(pageNumber),
        (resp) => processResponse(resp, pageNumber))));
return chainedRequests.fire();
```

Two consequences:

1. `totalPages` is **required** — so the client structurally forces the
   server into the `Page` shape. Swapping the URL to `/v2` alone would
   break paging (`page.totalPages` would be `undefined`, `_.range(1, undefined)`
   yields `[]`, and every entity would silently sync only its first 1000 rows).
2. All subsequent pages are built up-front from `totalPages` and fired as a
   fixed chain, rather than continuing until the data runs out.

## The fix

**Server** — nothing to build. *(Corrected: an earlier revision named only
`/programEncounter/v2` and `/subjectMigrations/v2` and asked for an audit to "add the
missing ones". In fact **21** Slice endpoints already exist, essentially the whole
transactional set, all routed through `ScopeBasedSyncService.*AsSlice`. So this is a
coverage check, not a build.)*

**Client — URL shape.** The Slice endpoints are a path **suffix** (`/individual/v2`),
but `ConventionalRestClient.getAllForEntity` joins `apiVersion` as a **prefix**:

```js
const resourceEndpoint = [settings.serverURL, entityMetadata.apiVersion,
                          resourceUrl || resourceName, searchFilter]
    .filter(p => !_.isEmpty(p)).join("/");
```

That produces `/v2/dashboard`, which is correct for the endpoints that exist in prefix
form, but it **cannot** produce `/individual/v2`. Reaching the Slice endpoints needs a
suffix mechanism, not just a metadata flag. Note `resourceUrl` is not a safe place to
put it — it doubles as the push URL.

**Client — the loop.** Replace count-driven paging with a drain loop keyed on
**`hasNext`**:

```js
// pseudocode
let pageNumber = 0;
while (true) {
    const resp = await getJSON(endpoint(pageNumber, size));
    const rows = _.get(resp, `_embedded.${entityMetadata.resourceName}`, []);
    await onGetOfAnEntity(entityMetadata, rows);
    if (!_.get(resp, 'slice.hasNext')) break;
    pageNumber++;
}
```

*(Corrected: an earlier revision used `if (rows.length < size) break;`. That is unsafe —
avni-server silently clamps `size` to 1000 and still returns HTTP 200, so if the client
ever requests more than the ceiling, page 0 returns 1000 rows, `1000 < 2000` is true,
and **every entity truncates to its first 1000 rows while the sync reports success**.
`hasNext` is already on the wire and cannot be fooled by the clamp.)*

**Client — the response envelope.** `SlicedResources` serializes its metadata under
**`slice`**, not `page`: `{"slice": {"size", "number", "hasNext"}}`. `processResponse`
currently only calls `afterGetOfEntity` when the response carries `page` or `content`,
so a Slice response would match neither and the **progress bar would silently stop
advancing** — a second silent-failure mode alongside the `totalPages` truncation.

### Knock-on: the progress bar

`ProgressbarStatus.onComplete` computes
`progress += syncWeight / (totalNumberOfPages * 100)`, so removing
`totalPages` removes the denominator. Options:

- Use `Slice.hasNext()` to render indeterminate progress per entity, and
  advance the weight on entity completion rather than per page.
- Keep a cheap server-supplied estimate (e.g. `entity_sync_status` row counts)
  purely for display, never for loop control.
- Accept a coarser bar: advance by `syncWeight` when each entity finishes.

This is the main piece of real work in the change and should be decided before
implementation.

## How to test it (cache is the trap)

Warm cache invalidates naive A/B timing: once the count's pages are in
`shared_buffers` / OS page cache, v1 and v2 both look fast. On this instance
`shared_buffers = DBInstanceClassMemory/32768` ≈ **1 GB** and
`effective_cache_size` ≈ **2 GB**, against a prerelease database holding a copy
of production across many orgs. The working set cannot fit, so any given org's
first sync of the day is cold — you cannot cache your way out of this, which is
precisely why the fix has to be algorithmic.

Ranked approaches:

1. **`EXPLAIN (ANALYZE, BUFFERS)` on the count query — best.**
   Reports `shared hit` vs `shared read` separately, quantifying the real work
   *independently of cache state*. Needs no cold cache and no cache flushing
   (which RDS can't do without a reboot anyway). This also settles whether the
   count is a sequential scan and whether an index would help.

2. **Warm-then-compare, to isolate the count.**
   On one encounter type: call **`/v2` first** (cheap — reads only 1000 rows),
   then **v1** on the same type. v2 will have warmed only the first page's data
   pages; v1's extra time is then attributable almost entirely to the COUNT
   over the remaining rows. Clean isolation without needing a cold start.

3. **A different JSCS user.** Shares the same tables and indexes, but a
   different catchment scope means a different row set, so it is only *partly*
   cold. Weaker than 1 or 2.

4. **Same user (`mahanew4@jscs`) after time has passed.** Plausible that other
   orgs' activity has evicted JSCS pages, but unverifiable without
   `pg_buffercache`. Do not rely on it for a headline number.

Whatever is used, alternate the order across several encounter types so that
whichever runs first does not win by warming the cache for the other.

## Measured cost of the COUNT (pg_stat_statements, prerelease primary)

`pg_stat_statements` on the prerelease database recorded the real queries
issued by the syncs on 2026-08-28. Splitting `program_encounter` sync
traffic into the two halves a `Page` performs:

| Half | calls | total exec | max single call | blocks read | read from disk |
|---|---:|---:|---:|---:|---:|
| DATA fetch (`limit`/`offset`) | 629 | 1,057 s | 190,489 ms | 892,274 | 6,971 MB |
| **COUNT (`Page` only)** | **220** | **895 s** | **311,061 ms** | **568,621** | **4,442 MB** |

The count alone:

- accounts for **~46%** of all `program_encounter` sync query time (895 s of 1,952 s),
- reads **4.4 GB from disk** that a `Slice` would never touch,
- has a worst single execution of **311 s** — beyond the ALB's 300 s ceiling,
  i.e. by itself sufficient to make a sync page unservable.

Switching these endpoints to `Slice` removes that entire column of work.
It is not a micro-optimisation; it is roughly half the transactional sync cost.

Note the 220 : 629 ratio. Spring Data skips the count when page 0 returns
fewer rows than `pageSize`, so small entity types pay nothing. The cost is
concentrated exactly where it hurts most — large, cold, first-page pulls.

## I/O saturation caused by abandoned queries

RDS metrics for `prerelease-db-20260804` (db.t4g.medium, gp3, 3,000
provisioned IOPS) during the sync window versus idle:

| Metric | During sync (12:05–12:30 IST) | Idle (13:40–14:15 IST) |
|---|---|---|
| ReadIOPS (avg) | 1,978 → **2,881** | 0.27 – 71 |
| ReadIOPS (max) | **3,081** (at the 3,000 cap) | 177 |
| DiskQueueDepth | 8 → **24** | 0.03 |
| CPUUtilization | 11–26% | ~9% |

The database was **IOPS-saturated, not CPU-saturated**. `ReadLatency` stayed
low (<7 ms) because gp3 was delivering its full quota; the wait was in the
queue, not the device. CPU and latency alone are misleading here — the
metrics that matter are ReadIOPS against the provisioned ceiling and
DiskQueueDepth.

This is the mechanism behind retry amplification: an abandoned query keeps
issuing reads against a fixed IOPS budget, so each retry starves the next.

## Why a retry cannot reuse the abandoned query's work

Asked and answered, because it looks like it should be possible:

- **Hibernate L1 (persistence context)** is per-session and dies with the
  request. A retry is a new HTTP request, so a new session. No reuse.
- **Hibernate L2 + query cache are enabled**
  (`hibernate.cache.use_second_level_cache=true`,
  `hibernate.cache.use_query_cache=true`, `region.factory_class=jcache`) but
  cannot help: the query cache keys on query text **plus parameter values**,
  and every sync attempt sends a fresh `now` timestamp
  (`now=06:17:11`, `06:42:28`, `06:49:16` on three consecutive attempts).
  The key never repeats, so a retry is a guaranteed miss. Separately, the L2
  entity cache stores entities by id, which does nothing for a `COUNT`.
- **PostgreSQL performs no request coalescing.** Two identical concurrent
  queries execute independently; there is no mechanism by which the second
  waits for the first. So each retry genuinely starts new work.

If response reuse were wanted, `now` would have to be quantised (e.g. rounded
to the minute) so that a retry produces an identical cache key. That is a
possible optimisation but secondary to removing the count.

## Related findings

- **Timeout layering.** `statement_timeout = 7,200,000 ms` (2 h) versus an ALB
  `idle_timeout` of **300 s**. Queries abandoned by the ALB keep executing for
  up to two hours, and client retries stack more of them onto the same box.
  This is almost certainly why timings escalated 62 s → 140 s → 367 s → 507 s
  across four attempts. Tracked separately.

- **Retry amplification.** Because nothing cancels the abandoned query, each
  user-initiated retry makes the next attempt slower. Any fix here should be
  paired with a server-side timeout below the ALB's.
