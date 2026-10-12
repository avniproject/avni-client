# Query census — measure the Realm→SQLite fallback surface

Classifies a corpus of `.filtered()` predicates through the **checked-out**
`RealmQueryParser` into buckets:

| Bucket | Meaning |
|---|---|
| FULL_SQL | fully translated (incl. opportunistic SUBQUERY→`IN`/`json_each`) |
| PARTIAL | SQL pre-narrow + JS residual (`partialParse` + `skippedClauses`) |
| FULL_FALLBACK | whole-table hydration + JS post-filter — **the perf cliff** |
| PARSE_ERROR | parser threw; lands in JS fallback with the raw query |
| DYNAMIC | predicate is a runtime variable — not statically classifiable |

Background, prod-wide results, and the fix plan: the parser-fix census in
[avni-product-ops](https://github.com/avniproject/avni-product-ops/blob/main/analysis/realm-sqlite-perf-risks/parser-fix-census.md).
Related stories: [#1977](https://github.com/avniproject/avni-client/issues/1977),
[#1978](https://github.com/avniproject/avni-client/issues/1978),
[#1981](https://github.com/avniproject/avni-client/issues/1981).

## Corpus A — this codebase (self-contained)

```bash
cd packages/openchs-android
node scripts/query-census/dump-prop-schema-map.mjs      # once per openchs-models bump
python3 scripts/query-census/extract_client_corpus.py   # -> scripts/query-census/corpus.jsonl
CENSUS_CORPUS=scripts/query-census/corpus.jsonl npx jest QueryCensus
```

## Corpus B — real org rules from prod

Produced by `analysis/realm-sqlite-perf-risks/scripts/census/extract_corpus.py` in
avni-product-ops (needs read-only prod-DB access; ops concern). Point `CENSUS_CORPUS`
at the resulting `corpus.jsonl` and run the same jest command.

**Corpus files contain org rule text — never commit them** (this dir's `.gitignore`
covers the default filenames).

## The #1978 done-check

```bash
CENSUS_CORPUS=<prod-corpus.jsonl> CENSUS_MAX_FALLBACK_WEIGHTED=50 npx jest QueryCensus
```

Fails if the weighted FULL_FALLBACK count is not below the budget. Without the env
vars the test is skipped, so normal `npx jest` runs and CI are unaffected.

`census-results.jsonl` (written next to the corpus) has one line per distinct
predicate with its bucket, parser reason, and skipped clauses — grep it for
`FULL_FALLBACK` to see exactly which shapes still hydrate whole tables.
