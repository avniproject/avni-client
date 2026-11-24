# Custom report card queries — SQLite migration scope

Evaluates whether `RealmQueryParser` can carry the production custom-card query workload on the
SQLite backend, or whether manual query translation is needed. Verdict: **the parser does the
work**; manual translation would be slower, less reliable, and unmaintainable (org-authored
queries change server-side without app releases, and 199 of them are assembled at runtime).

## Corpus

Source: `docs/active_report_cards.csv` — active custom report cards across 56 production
organisations. A card is *active* when its full chain is alive: card → section → dashboard →
group_dashboard → non-voided group. Standard-type cards excluded (app-owned code, covered by
app-side testing once).

- 643 card rows → 436 distinct card rules (JS functions) → 582 `.filtered()` calls
  → **357 distinct (schema, filter) pairs**
- Schemas queried: Individual 265, ProgramEncounter 99, ProgramEnrolment 75, Encounter 48,
  AddressLevel 19, UserInfo 4

Every distinct filter was run through the real `RealmQueryParser` with the production schema set
and dummy runtime args. Results are recorded per card in `docs/active_report_cards.csv`
(columns `parser_verdict`, `translated_sql`, `was_mistranslated`).

## Verdict categories and counts

Per card (all 643 rows; a card takes the verdict of its worst filter):

| Verdict | Cards | Meaning |
|---|---|---|
| translated | 321 | Every filter compiles to native SQL — full speed, statically verified |
| dynamic | 199 | Filter string assembled in JS at runtime (`${query}` template slots); goes through the same parser when the rule runs, but unverifiable offline |
| full-table scan | 68 | `db.objects('X')` with no `.filtered()` — rule filters rows in JS by design; nothing for the parser to get wrong, but hydrates the whole table |
| fallback | 38 | Parser routes to `JsFallbackFilterEvaluator` — correct results, cost scales with table size |
| partial | 12 | Most clauses compile to SQL; a residue clause (typically a nested SUBQUERY) is evaluated in JS on the SQL-narrowed rows |
| no query stored | 5 | Empty `card_query` |

Per distinct filter (357): translated 269, partial 27, dynamic 55, fallback 6, hard errors 0.

Concentrations that shrink the follow-up work:

- **Dynamic is a 2-org phenomenon**: org 702 (97 cards) and org 272 (66 cards) share rule
  templates with a `${query}` slot — auditing two templates resolves 163 of the 199.
- **Fallback is 6 unique queries** copy-pasted across 38 cards (orgs 730, 391, 702, 1014):
  3 top-level `OR` spanning a `SUBQUERY` (legitimately hard in SQL), 3 using `IN {…}` /
  `IN $0` list membership (a small, addable parser feature).

## Bug found and fixed during the sweep

`RealmQueryParser._parseSubqueryClause` matched the `.@count <op> N` suffix with no end anchor.
A query **starting** with `SUBQUERY(...)` silently dropped every condition after the count
comparison: `SUBQUERY(enrolments, …).@count > 0 and voided = false` translated to only the
IN-subselect — returning voided rows Realm would exclude. Wrong counts, no error, no fallback.
**17 active production cards** used this shape (it is the most common card idiom's ordering).

Fix: reject trailing residue in `_parseSubqueryClause` so such queries route to the top-level
clause splitter, which translates both parts. Regression tests added in
`RealmQueryParserTest` ("conditions AFTER a leading SUBQUERY are translated, not dropped").
The `translated_sql` column reflects the fixed parser; `was_mistranslated = YES` marks the 17.

## Follow-ups

1. Add `IN {…}` / `IN $0` support to the parser (halves the fallback bucket; the shape also
   appears inside dynamic templates).
2. Audit the two dynamic rule templates (orgs 702 and 272) — collapses the dynamic bucket.
3. Profile the 6 fallback queries and the 68 full-table-scan cards on a large-org database;
   JS evaluation hydrates entire tables (Individual / ProgramEncounter).
4. Run the 357-filter corpus through the Realm-oracle comparison harness on a real org DB —
   the definitive equivalence check; this sweep proves parseability, the oracle proves results.

## Open-card triage against this corpus

How each open parser/proxy card stands when measured against the active-card corpus:

| Card | Status against corpus | Verdict |
|---|---|---|
| #1977 TRUEPREDICATE sort/Distinct → window SQL | All 5 corpus shapes (incl. the census's dominant 180×/68× strings) fully translate; 12 framework fallback sites covered | **Implementation done** — remaining work is closure: census re-run + framework-site verification, on a build that also carries the SUBQUERY-drop fix |
| #2076 top-level OR split | The 3 OR-spanning-SUBQUERY fallbacks in the corpus are this shape; measured 32,808-row / ~43 s hydration per card | **Live performance work** — affects current orgs |
| #1978 SUBQUERY families B/C/D | 78 nested-SUBQUERY filters, of which 61 already translate; residue = 17 B/C partial/fallback filters (+ ~13 D). 50 cards (12 partial + 38 fallback) across 9 orgs, concentrated in 730/391/1129/702 | **Keep, but re-baseline the census first** — current parser covers most of family B already; scope is C + D + residue |
| #2085 collection API narrower than Realm | Zero rules in the corpus call a missing method on a collection (single `.values()` hit is a JS `Map`). Premise flaw: rules receive `RealmResultsProxy` (not raw `Realm.Results`), which lacks the same methods; the SQLite proxy's rule-facing surface is a strict superset (`count`, `countDistinct`, `distinctValues` extra). Item shapes and `Object.keys` behaviour are identical on both backends | **Rescope** — verify one `.concat` rule on Realm (expected: throws there too); keep only a drift-guard test with invariant `SqliteResultsProxy ⊇ RealmResultsProxy` |
| #2081 ALL/NONE quantifiers | Zero uses in 68,826 production rules; fails loud, not wrong | **Polish** — lowest priority |

## Direct-SQL support (future queries)

Already built and documented — no new card needed:

- Rules: `params.db.isSqlite` branch flag; `execQuery(sql, params)` (SELECT-only, flat rows);
  `execCount`; `execReport(countSql, countParams, listSql, listParams, schema)` — immediate
  count, lazily hydrated line list on card tap (purpose-built for report cards).
- App code: same plus `execCountEntities`, `bulkCreate`/`executeBatch`, and targeted write
  methods (e.g. `recomputeLatestEntityApprovalStatus`).
- Authoring guide: `docs/RuleSqlMigrationGuide.md` (branching pattern, snake_case conventions),
  referenced from `RealmToSqliteOverview.md`. Rules stay read-only by contract — no write API,
  deliberately.

Strategy conclusion: the parser carries the general load (it is required regardless — for the
runtime-composed app queries, the org-rule universe, and the Realm/SQLite dual-backend period);
individual queries move to native SQL via `execQuery`/`execReport` one deliberate,
profiling-justified case at a time. Wholesale hand-translation of app or org queries was
evaluated and rejected: it cannot cover runtime-assembled queries, doubles maintenance during
the dual-backend period, has no equivalence oracle, and ends with the parser still required.

## How queries execute today (the pipeline)

Realm query syntax is the common intermediate language. Every query producer — static strings
in services, the 10 runtime query-generator modules (listed below), and org-authored rules —
emits ONE string in Realm syntax; each backend consumes it its own way:

```
generator / service / org rule
    │  builds one string, in Realm syntax:
    │  "voided = false AND SUBQUERY(observations, $o, ...).@count > 0"
    ▼
.filtered(thatString)
    │
    ├─ Realm device:   string handed to Realm as-is (native)
    │
    └─ SQLite device:  RealmQueryParser translates the same string → SQL → SQLite executes
                       (untranslatable shapes → JsFallbackFilterEvaluator runs the same
                        string row-by-row in JS — correct, slower)
```

Producers are unaware of the backend — which is why the 246 app call sites and ~10 generators
needed zero changes for the migration. Translation happens at query time, per call.

**Performance of translating:** the parse step is string-processing — microseconds against the
query's milliseconds. #1977's QA measured the dominant census shape at 612 ms before and after
the translation landed (parse overhead does not register); translations are cacheable by
string if profiling ever demands it. Translation is not a cost but the migration's largest
performance win: the alternative path is the JS fallback, which hydrates every row and filters
in JavaScript. Measured: 11 ms translated vs 762 ms fallback for the dominant framework shape
(~70×); 32,808 rows / ~43 s for one fallback dashboard card (#2076). Every shape taught to the
parser moves queries from "load the table into JS" to "let the database answer" — which is why
the remaining feature cards (#2076, #1978 residue, IN support) are performance work.

All backend-dialect knowledge (rowid tiebreaks, `IS NULL` conventions, join aliasing, window
functions) lives in exactly one tested place — the parser. The architecture is *many speakers,
one translator*; removing the parser turns it into *every speaker becomes bilingual* — the
same total knowledge, scattered across every producer.

### The 10 query-generator modules

Modules whose job is *composing* query strings at runtime (as opposed to services that merely
hold static ones). Only 2–3 are individually complex (`CustomFilterService`,
`EntityApprovalStatusService`, partly `ReportCardQueryBuilder`); the rest emit simple
fragments — but their simplicity is borrowed from the parser: fragments like
`subjectType.uuid = "x"` compose as plain strings only because the parser later resolves
dot-paths into JOINs with coordinated aliases across the whole assembled query. As SQL
emitters, independently-written fragments must manage joins/aliases without colliding —
which forces either per-fragment subselects or a shared query-builder abstraction, i.e. a
translator with a different entry point:

| Module | What it generates |
|---|---|
| `service/query/RealmQueryService.js` | the glue: `andQuery` / `orQuery` / `filterBasedOnAddress`; every composed predicate passes through it |
| `service/customDashboard/ReportCardQueryBuilder.js` | card config (subject types / programs / encounter types) → criteria; the OR-of-AND-branches shape #2076 targets |
| `service/CustomFilterService.js` | org-defined dashboard filters (text / numeric / date / time / coded) → observation `SUBQUERY(...)` fragments, AND-ed onto card queries |
| `model/DashboardReportFilter.js` | filter selections (address, as-on-date, form metadata) → criteria values the builders consume |
| `service/query/IndividualSearchCriteria.js` | subject-search inputs (name / age / address / obs) → one composed query |
| `service/query/FamilySearchCriteria.js` | same pattern for family search |
| `service/EntityApprovalStatusService.js` | the five-branch approval query, with `getEntityTypeQuery()` fragments swapped per the user's form-mapping filter |
| `action/mydashboard/MyDashboardActions.js` | subject-type OR-filters applied to every My Dashboard count |
| `service/PrivilegeService.js` | privilege-restriction predicates (allowed subject-type / program / encounter-type uuid lists), plus its own `TRUEPREDICATE DISTINCT` queries |
| `service/BaseAddressLevelService.js` | address-hierarchy traversal queries (parent-uuid lists, level walks) |

Borderline (would be touched, not rewritten): `FormMappingService` and assorted entity
services with occasional criteria strings.

### Executor files — the three support tiers

The parser covers Realm's *used* subset, not its full language (support-by-census, deliberate).
What happens to a query depends on which tier it lands in, each owned by a specific file
(all under `src/framework/db/`):

| Tier | What happens | Owned by |
|---|---|---|
| 1. Translated | Realm string → SQL; database answers. Fast path. | `RealmQueryParser.js` (grammar → WHERE/JOINs/window), executed through `SqliteResultsProxy.js` (query build, chaining, lazy execution, entity wrapping) |
| 2. Untranslatable but evaluable | Parser flags `unsupported` → the same string is evaluated row-by-row in JS over hydrated rows. Correct, slow — a performance ticket, never a wrong number. | `JsFallbackFilterEvaluator.js` (routed by `SqliteResultsProxy`), rows hydrated by `EntityHydrator.js` |
| 3. Neither translatable nor evaluable | Throws `UnsupportedRealmQueryError` naming the query — fails loud, never silently returns wrong/unfiltered rows. Constructs: `ALL`, `NONE`, `@links`, `@sum/@avg/@min/@max`. Measured usage: **zero** in 68,826 production rules (#2081's scan). | `JsFallbackFilterEvaluator.js` catch-all |
| Bypass | Hand-written SQL for profiling-justified hot paths — skips all tiers. | `SqliteProxy.js`: `execQuery` / `execCount` / `execCountEntities` / `execReport`, plus purpose-built methods (e.g. `recomputeLatestEntityApprovalStatus`) |

Tier-3 is the only true "not supported", and its exposure is future rules only. The cheapest
enforcement is **save-time validation in avni-webapp**: run the authored query through the
parser + evaluability check when a card/rule is saved — reject tier-3 with the construct
named, warn on tier-2 with a performance note. Moves the refusal from the user's dashboard to
the implementer's save button. (Candidate card; would subsume #2081.)

## Alternative evaluated: complete hand-translation (rejected)

The counter-proposal — translate every query to SQL and remove the parser — was sized
concretely. Scope restricted to what the team can actually edit (in-repo code + the active
card rules; the wider 68k org-rule universe ignored for this comparison):

| Surface | Count | Notes |
|---|---|---|
| App `src` `.filtered()` call sites | 246 | 135 static strings (clean translations); 35 with `${}` interpolation (need parameterised-SQL rework); 47 fed from query *generators*; ~29 other |
| Query-generator modules | 10 | compose query strings at runtime; each would need rewriting as a SQL emitter (each is a mini-compiler; the hardest 20%). Full list with roles: see "The 10 query-generator modules" in the pipeline section above |
| App `.sorted()` sites + results-chaining | 32+ | the chainable-collection API dies with the parser, so consumers change shape |
| Active card-rule bodies | 436 | rewritable by implementers via `execReport`/`execQuery`, BUT 199 are runtime-assembled (redesigns, not translations) and every rewritten rule needs `isSqlite` dual-form branching until its org migrates |
| rules-config repo | **0** | checked — no database query call sites (it is a form/rule-authoring DSL) |
| avni-health-modules repo | **0** | checked — no query call sites in source (a handful in built bundles only) |

Total: **≈ 690 discrete edits** (246 + ~10 generator rewrites + 436 rule bodies), each needing
its own verification with no equivalence oracle, most needing dual Realm/SQLite forms during
the transition. Rejected because:

1. Runtime-composed queries (82 app sites + 199 dynamic rules) cannot be pre-translated —
   something must translate at runtime, so the parser survives the rewrite anyway.
2. One codebase serves both backends for the whole migration; per-call-site SQL means
   per-backend code paths and silent drift between them.
3. No oracle can certify 690 hand translations; the parser is one implementation certified
   once against the corpus.
4. The 630-card set is a snapshot — implementers keep authoring Realm-syntax rules, so
   removal also requires banning `.filtered` in rules (a platform/product decision).
5. Parser-side remaining work is ~3 feature cards, each fixing a whole class of queries
   (e.g. the SUBQUERY-drop fix corrected 17 production cards at once).

Sanctioned middle path (already built): individual hot queries move to native SQL via
`execQuery`/`execCount`/`execReport` behind `params.db.isSqlite`, one profiling-justified
case at a time (`docs/RuleSqlMigrationGuide.md`).

## Remaining work — honest inventory

"Three cards" is the feature backlog only. The complete remaining program:

Feature cards:
1. #2076 — top-level OR split (open, scoped, measured).
2. `IN {…}` / `IN $0` support — no card filed yet.
3. #1978 residue — families C + D, after re-baselining the census against the current parser.

Verification / closure items:
4. #1977 closure — census re-run + framework-site verification per its acceptance criteria.
5. Commit + QA the SUBQUERY-drop fix (currently uncommitted; corrects 17 live cards).
6. Realm-oracle corpus run — the sweep proves the 357 filters *parse*; only an oracle run on
   a real org DB proves identical *rows*. The most important remaining verification.
7. Standing regression harness — turn the corpus sweep into a CI test so parser changes are
   checked against production shapes automatically.
8. Dynamic-template audit — orgs 702 and 272 (collapses the 199-card dynamic bucket).
9. #2085 rescope — the `SqliteResultsProxy ⊇ RealmResultsProxy` drift-guard test; verify one
   `.concat` rule on Realm.
10. Pilot profiling — the 68 full-table-scan cards and 6 fallback queries on a large-org DB;
    may spawn a few per-card `execReport` rewrites.

Plus an ongoing rollout-QA tail: per-org migrations keep surfacing bugs no card predicted
(this analysis window alone: the approval-link column, the double-wrap crash, the
SUBQUERY-drop) — expect a bug-fix card every week or two during rollout, decaying as orgs
accumulate. Still an order of magnitude below the ~690-edit hand-translation alternative
sized and rejected in the previous section.

## Org 401 (chashma) — pilot-specific verdicts

All 8 of chashma's active custom cards are full-table scans (no Realm filters at all): zero
TRUEPREDICATE / SUBQUERY / OR shapes. #1978 and #2076 are not required for its custom cards;
#1977 is required at the build level (framework sync queries), and is already implemented.
Its dashboard risk is scan cost, not parser coverage — details and actions recorded in
`chashma-realm-sqlite-migration-plan.md` (report-card sweep item).

## Artifacts

- `docs/active_report_cards.csv` — per-card verdict, translated SQL, mistranslation flag
- Corpus + sweep outputs: session scratchpad (`card_filters.json`, `filter_sql.json`,
  `filter_sql_prefix.json` for the pre-fix diff)
- Parser fix: `src/framework/db/RealmQueryParser.js` (`_parseSubqueryClause` end-anchor)
