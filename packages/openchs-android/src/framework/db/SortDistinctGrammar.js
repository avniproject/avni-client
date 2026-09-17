/**
 * Shared parser for the sort(...) / Distinct(...) mini-grammar Realm accepts after
 * TRUEPREDICATE (and, for sort, as a trailing clause on the JS fallback evaluator's queries).
 *
 * Single source so RealmQueryParser (SQL translation) and JsFallbackFilterEvaluator (JS
 * fallback) can't drift — they did, more than once: the SQL side understood multi-key sorts
 * and multi-field Distinct while the fallback side only ever parsed one of each, and a fix
 * for the long "ascending"/"descending" spelling had to be applied to three separate regexes
 * in the same commit to keep them agreeing.
 */

const SORT_KEY = /^([\w.]+)(?:\s+(asc|desc|ascending|descending))?$/i;

/**
 * Pull the first `keyword(...)` invocation (case-insensitive) out of `str` — e.g. "sort" or
 * "distinct". Returns {body, rest} with the invocation removed from `rest`, or null if the
 * keyword isn't present.
 */
function extractCall(str, keyword) {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = str.match(new RegExp(`\\b${escaped}\\s*\\(([^)]*)\\)`, "i"));
    if (!match) return null;
    const rest = (str.slice(0, match.index) + str.slice(match.index + match[0].length)).trim();
    return {body: match[1], index: match.index, rest};
}

/**
 * Parse a comma-separated sort(...) body into [{field, desc}], in written order.
 * Returns null if any key is out-of-grammar (caller falls back to JS on null).
 */
function parseSortKeys(body) {
    const keys = body.split(",").map(s => s.trim()).filter(Boolean);
    if (keys.length === 0) return null;
    const parsed = keys.map(k => {
        const m = k.match(SORT_KEY);
        return m ? {field: m[1], desc: !!(m[2] && m[2].toUpperCase().startsWith("DESC"))} : null;
    });
    return parsed.some(k => k === null) ? null : parsed;
}

/**
 * Parse a comma-separated Distinct(...) body into field paths. Returns null if empty.
 */
function parseDistinctFields(body) {
    const fields = body.split(",").map(s => s.trim()).filter(Boolean);
    return fields.length === 0 ? null : fields;
}

export {extractCall, parseSortKeys, parseDistinctFields};
