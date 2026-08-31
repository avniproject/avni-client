import fs from "fs";
import path from "path";
import {runCensus, formatBucketTable} from "../../../scripts/query-census/QueryCensus";

/**
 * Env-gated census run — skipped in normal test runs / CI.
 *
 *   CENSUS_CORPUS=/path/to/corpus.jsonl npx jest QueryCensus
 *
 * Writes census-results.jsonl next to the corpus and prints the bucket table.
 * Optionally assert the perf-cliff budget (the avni-client#1978 done-check):
 *
 *   CENSUS_CORPUS=… CENSUS_MAX_FALLBACK_WEIGHTED=50 npx jest QueryCensus
 */
const corpusPath = process.env.CENSUS_CORPUS;
const describeIf = corpusPath ? describe : describe.skip;

describeIf("Query census over a predicate corpus", () => {
    it("classifies every corpus predicate through RealmQueryParser", () => {
        const entries = fs.readFileSync(corpusPath, "utf8")
            .split("\n").filter(Boolean).map(JSON.parse);
        const {results, buckets, total} = runCensus(entries);

        const outPath = path.join(path.dirname(corpusPath), "census-results.jsonl");
        fs.writeFileSync(outPath, results.map((r) => JSON.stringify(r)).join("\n") + "\n");
        // eslint-disable-next-line no-console
        console.log(`\n=== Query census ===\n${formatBucketTable({buckets, total})}\nresults -> ${outPath}\n`);

        expect(buckets.HARNESS_ERROR).toBeUndefined();

        if (process.env.CENSUS_MAX_FALLBACK_WEIGHTED !== undefined) {
            const budget = Number(process.env.CENSUS_MAX_FALLBACK_WEIGHTED);
            const fallbackWeighted = (buckets.FULL_FALLBACK && buckets.FULL_FALLBACK.weighted) || 0;
            expect(fallbackWeighted).toBeLessThan(budget);
        }
    });
});
