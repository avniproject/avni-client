/**
 * Query census — classify a corpus of .filtered() predicates through RealmQueryParser.
 *
 * Buckets:
 *   FULL_SQL      - fully translated (incl. opportunistic SUBQUERY->IN/json_each)
 *   PARTIAL       - SQL pre-narrow + JS residual (partialParse + skippedClauses)
 *   FULL_FALLBACK - unsupported: whole-table hydration + JS post-filter (the perf cliff)
 *   PARSE_ERROR   - parser threw; also lands in JS fallback (worst case)
 *   DYNAMIC       - predicate is a runtime variable; not statically classifiable
 *   HARNESS_ERROR - harness-level exception (investigate)
 *
 * Corpus entries (JSONL): {schema, arg, n, dynamic, ...} — see README.md for how
 * to produce a corpus from prod rules (avni-product-ops) or from this codebase
 * (extract_client_corpus.py).
 */
import {EntityMappingConfig} from "openchs-models";
import RealmQueryParser from "../../src/framework/db/RealmQueryParser";

const DUMMY_ARGS = Array.from({length: 16}, () => "PH");

function buildSchemaMap() {
    const schemas = EntityMappingConfig.getInstance().getRealmConfig().schema;
    const schemaMap = new Map();
    for (const s of schemas) {
        const raw = s && s.properties ? s : (s && s.schema ? s.schema : s);
        if (raw && raw.name) schemaMap.set(raw.name, raw);
    }
    return schemaMap;
}

function classifyEntry(e, schemaMap) {
    if (e.dynamic) return {bucket: "DYNAMIC", reason: null, skipped: null};
    try {
        const r = RealmQueryParser.parse(e.arg, DUMMY_ARGS, e.schema, schemaMap);
        if (r.unsupported) {
            const bucket = (r.reason || "").startsWith("Parse error") ? "PARSE_ERROR" : "FULL_FALLBACK";
            return {bucket, reason: r.reason || null, skipped: null};
        }
        if (r.partialParse && r.skippedClauses && r.skippedClauses.length > 0) {
            return {bucket: "PARTIAL", reason: null, skipped: r.skippedClauses};
        }
        return {bucket: "FULL_SQL", reason: null, skipped: null};
    } catch (err) {
        return {bucket: "HARNESS_ERROR", reason: String((err && err.message) || err), skipped: null};
    }
}

function runCensus(entries) {
    const schemaMap = buildSchemaMap();
    const origWarn = console.warn;
    console.warn = () => {}; // parser warns on every partial parse
    const buckets = {};
    const results = entries.map((e) => {
        const {bucket, reason, skipped} = classifyEntry(e, schemaMap);
        buckets[bucket] = buckets[bucket] || {distinct: 0, weighted: 0};
        buckets[bucket].distinct += 1;
        buckets[bucket].weighted += e.n || 1;
        return {...e, bucket, reason, skipped};
    });
    console.warn = origWarn;
    const total = {
        distinct: entries.length,
        weighted: entries.reduce((a, e) => a + (e.n || 1), 0),
    };
    return {results, buckets, total};
}

const BUCKET_ORDER = ["FULL_SQL", "PARTIAL", "FULL_FALLBACK", "PARSE_ERROR", "DYNAMIC", "HARNESS_ERROR"];

function formatBucketTable({buckets, total}) {
    const lines = [
        `predicates: ${total.distinct} distinct, ${total.weighted} weighted (by occurrences)`,
    ];
    for (const b of BUCKET_ORDER) {
        if (!buckets[b]) continue;
        const {distinct, weighted} = buckets[b];
        lines.push(
            `${b.padEnd(14)} distinct=${String(distinct).padStart(6)} (${((100 * distinct) / total.distinct).toFixed(1)}%)   ` +
            `weighted=${String(weighted).padStart(7)} (${((100 * weighted) / total.weighted).toFixed(1)}%)`
        );
    }
    return lines.join("\n");
}

export {buildSchemaMap, classifyEntry, runCensus, formatBucketTable, DUMMY_ARGS, BUCKET_ORDER};
