/**
 * Shared parser for the sort(...) / Distinct(...) mini-grammar Realm accepts after
 * TRUEPREDICATE (and, for sort, as a trailing clause on the JS fallback evaluator's queries).
 *
 * Single source so RealmQueryParser (SQL translation) and JsFallbackFilterEvaluator (JS
 * fallback) can't drift — they did, more than once: the SQL side understood multi-key sorts
 * and multi-field Distinct while the fallback side only ever parsed one of each; a fix for the
 * long "ascending"/"descending" spelling had to be applied to three separate regexes in the
 * same commit to keep them agreeing; and the two engines decided "Distinct written before
 * sort" — which changes the rows, not just their order — by two different mechanisms, one of
 * which had already lost the word boundary the other had gained.
 */

const SORT_KEY = /^([\w.]+)(?:\s+(asc|desc|ascending|descending))?$/i;

// The descriptors Realm allows in the tail: sort(...) and Distinct(...), in either case, with
// a body that runs to the first ")". Kept as one pattern so a caller can't recognise a call
// the others don't.
const DESCRIPTOR_CALL = "\\b(sort|distinct)\\s*\\(([^)]*)\\)";

/**
 * Split a descriptor tail into its sort(...)/Distinct(...) calls **in written order**, which
 * is the order Realm applies them in.
 *
 * @param str the text after TRUEPREDICATE (or any tail to inspect)
 * @returns {{descriptors: Array<{keyword: string, body: string, index: number}>, rest: string}}
 *          `rest` is what is left once every recognised call is removed — non-empty means the
 *          string carries something outside this grammar.
 */
function parseDescriptors(str) {
    const re = new RegExp(DESCRIPTOR_CALL, "gi");
    const descriptors = [];
    let rest = "";
    let lastIndex = 0;
    let match;
    while ((match = re.exec(str)) !== null) {
        descriptors.push({keyword: match[1].toLowerCase(), body: match[2], index: match.index});
        rest += str.slice(lastIndex, match.index);
        lastIndex = match.index + match[0].length;
    }
    return {descriptors, rest: (rest + str.slice(lastIndex)).trim()};
}

/**
 * Pull a trailing `keyword(...)` — one anchored at the end of `str`, so the text before it is
 * still an intact predicate. Returns {body, rest} or null.
 */
function extractTrailingCall(str, keyword) {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = str.match(new RegExp(`\\b${escaped}\\s*\\(([^)]*)\\)\\s*$`, "i"));
    if (!match) return null;
    return {body: match[1], index: match.index, rest: str.slice(0, match.index).trim()};
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

export {parseDescriptors, extractTrailingCall, parseSortKeys, parseDistinctFields};
