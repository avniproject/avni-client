/**
 * JsFallbackFilterEvaluator - Post-filters hydrated entities for Realm query
 * patterns that can't be translated to SQL.
 *
 * Supported patterns:
 *   - TRUEPREDICATE DISTINCT(field) — deduplication by field value
 *   - SUBQUERY(listProp, $var, conds).@count OP N — sub-filtering on list properties
 *   - listProp.@count OP N / listProp.@size OP N — collection size check
 *   - ANY listProp.field OP value — quantifier over list elements
 *   - limit(N) — inline result limit (applied as slice after other filters)
 *   - @links.@count — inverse relationships (not evaluable, returns empty)
 */

class JsFallbackFilterEvaluator {
    /**
     * Apply all fallback filters sequentially to entities.
     *
     * @param {Array} entities - hydrated entity objects
     * @param {Array} fallbackFilters - [{query, args, reason}]
     * @param {string} schemaName - for logging
     * @returns {Array} filtered entities
     */
    static apply(entities, fallbackFilters, schemaName) {
        let result = entities;
        for (const filter of fallbackFilters) {
            result = this._applyOne(result, filter, schemaName);
        }
        return result;
    }

    static _applyOne(entities, filter, schemaName) {
        const {query, args} = filter;
        const trimmed = query.trim();

        // TRUEPREDICATE DISTINCT(field)
        if (/TRUEPREDICATE/i.test(trimmed) && /DISTINCT\s*\(/i.test(trimmed)) {
            return this._applyDistinct(entities, trimmed, args);
        }

        // @links.@count — inverse relationships not evaluable without index
        if (/@links/i.test(trimmed)) {
            console.warn(`JsFallbackFilterEvaluator: @links.@count not evaluable — returning empty for ${schemaName}`);
            return [];
        }

        // SUBQUERY(listProp, $var, conditions).@count OP N
        if (/SUBQUERY\s*\(/i.test(trimmed)) {
            return this._applySubqueryCount(entities, trimmed, args, schemaName);
        }

        // listProp.@count OP N  or  listProp.@size OP N
        const listCountMatch = trimmed.match(/^(\w+(?:\.\w+)*)\.@(?:count|size)\s*(==|!=|<>|<=|>=|<|>|=)\s*(\d+)$/i);
        if (listCountMatch) {
            return this._applyListCount(entities, listCountMatch[1], listCountMatch[2], parseInt(listCountMatch[3], 10));
        }

        // ANY listProp.field OP value
        if (/^\s*ANY\b/i.test(trimmed)) {
            return this._applyAnyQuantifier(entities, trimmed, args);
        }

        // limit(N) — inline result limit
        const limitMatch = trimmed.match(/\blimit\s*\(\s*(\d+)\s*\)/i);
        if (limitMatch) {
            return this._applyLimit(entities, trimmed, args, limitMatch, schemaName);
        }

        console.warn(`JsFallbackFilterEvaluator: unrecognized fallback query for ${schemaName}: "${trimmed.substring(0, 120)}"`);
        return entities;
    }

    // ──── TRUEPREDICATE DISTINCT(field) ────

    static _applyDistinct(entities, query, args) {
        // Extract DISTINCT(field) — field may contain dots
        const distinctMatch = query.match(/DISTINCT\s*\(\s*([\w.]+)\s*\)/i);
        if (!distinctMatch) {
            console.warn(`JsFallbackFilterEvaluator: could not parse DISTINCT field from: "${query}"`);
            return entities;
        }
        const field = distinctMatch[1];

        // Check for embedded SORT(field dir) — used in some queries
        const sortMatch = query.match(/SORT\s*\(\s*([\w.]+)\s+(ASC|DESC)\s*\)/i);

        if (sortMatch) {
            const sortField = sortMatch[1];
            const sortDesc = sortMatch[2].toUpperCase() === "DESC";

            // Sort a copy to determine winners per distinct value
            const sorted = [...entities].sort((a, b) => {
                const va = this._resolveFieldValue(a, sortField);
                const vb = this._resolveFieldValue(b, sortField);
                if (va == null && vb == null) return 0;
                if (va == null) return sortDesc ? 1 : -1;
                if (vb == null) return sortDesc ? -1 : 1;
                if (va < vb) return sortDesc ? 1 : -1;
                if (va > vb) return sortDesc ? -1 : 1;
                return 0;
            });

            // Pick first occurrence per distinct value from sorted copy
            const winners = new Map();
            for (const entity of sorted) {
                const val = this._resolveFieldValue(entity, field);
                const key = val == null ? "__null__" : String(val);
                if (!winners.has(key)) {
                    winners.set(key, entity);
                }
            }

            // Filter original array to those winners (preserves original/SQL order)
            const winnerSet = new Set(winners.values());
            return entities.filter(e => winnerSet.has(e));
        }

        // Simple dedup — keep first occurrence per unique field value
        const seen = new Set();
        return entities.filter(entity => {
            const val = this._resolveFieldValue(entity, field);
            const key = val == null ? "__null__" : String(val);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    // ──── SUBQUERY(listProp, $var, conditions).@count OP N ────

    static _applySubqueryCount(entities, query, args, schemaName) {
        // Parse: SUBQUERY(listProp, $var, conditions).@count OP N
        // Must handle nested parens in conditions
        const subqueryStart = query.match(/SUBQUERY\s*\(/i);
        if (!subqueryStart) return entities;

        const parsed = this._parseSubquery(query);
        if (!parsed) {
            console.warn(`JsFallbackFilterEvaluator: could not parse SUBQUERY for ${schemaName}: "${query.substring(0, 120)}"`);
            return entities;
        }

        const {listProp, varName, conditions, operator, count} = parsed;

        return entities.filter(entity => {
            const list = this._resolveFieldValue(entity, listProp);
            if (!Array.isArray(list)) return this._compareCount(0, operator, count);

            let matchCount = 0;
            for (const item of list) {
                if (this._evaluateConditionString(item, conditions, varName, args)) {
                    matchCount++;
                }
            }
            return this._compareCount(matchCount, operator, count);
        });
    }

    /**
     * Parse a SUBQUERY expression. Handles nested parens in conditions.
     * Returns {listProp, varName, conditions, operator, count} or null.
     */
    static _parseSubquery(query) {
        // Find the opening paren of SUBQUERY(
        const startMatch = query.match(/SUBQUERY\s*\(/i);
        if (!startMatch) return null;

        const openIdx = startMatch.index + startMatch[0].length;

        // Extract three comma-separated arguments respecting nested parens
        const argStrs = this._splitSubqueryArgs(query, openIdx);
        if (!argStrs || argStrs.length < 3) return null;

        const listProp = argStrs[0].trim();
        const varName = argStrs[1].trim(); // e.g. "$observation"
        const conditions = argStrs[2].trim();

        // After the closing paren, expect .@count OP N
        // Find the position after the SUBQUERY closing paren
        const afterClose = query.substring(openIdx);
        // Re-find the closing paren position
        let depth = 1;
        let closePos = 0;
        for (let i = 0; i < afterClose.length; i++) {
            if (afterClose[i] === '(') depth++;
            else if (afterClose[i] === ')') {
                depth--;
                if (depth === 0) {
                    closePos = openIdx + i + 1;
                    break;
                }
            }
        }

        const tail = query.substring(closePos).trim();
        const countMatch = tail.match(/^\.@count\s*(==|!=|<>|<=|>=|<|>|=)\s*(\d+)/i);
        if (!countMatch) return null;

        return {
            listProp,
            varName,
            conditions,
            operator: countMatch[1],
            count: parseInt(countMatch[2], 10),
        };
    }

    /**
     * Split SUBQUERY arguments (listProp, $var, conditions) respecting nested parens.
     */
    static _splitSubqueryArgs(query, startIdx) {
        const args = [];
        let depth = 0;
        let current = "";

        for (let i = startIdx; i < query.length; i++) {
            const ch = query[i];
            if (ch === '(') {
                depth++;
                current += ch;
            } else if (ch === ')') {
                if (depth === 0) {
                    // End of SUBQUERY args
                    if (current.trim()) args.push(current);
                    return args;
                }
                depth--;
                current += ch;
            } else if (ch === ',' && depth === 0) {
                args.push(current);
                current = "";
            } else {
                current += ch;
            }
        }

        if (current.trim()) args.push(current);
        return args;
    }

    // ──── listProp.@count / @size OP N ────

    static _applyListCount(entities, field, operator, count) {
        return entities.filter(entity => {
            const list = this._resolveFieldValue(entity, field);
            const len = Array.isArray(list) ? list.length : 0;
            return this._compareCount(len, operator, count);
        });
    }

    // ──── ANY listProp.field OP value ────

    static _applyAnyQuantifier(entities, query, args) {
        // Parse: ANY listProp.field OP value
        // Also handles: ANY listProp.field CONTAINS[c] value
        const stringOpMatch = query.match(
            /^\s*ANY\s+([\w]+)\.([\w.]+)\s+(CONTAINS|BEGINSWITH|ENDSWITH)\s*(?:\[c\])?\s+(.+)$/i
        );
        if (stringOpMatch) {
            const listProp = stringOpMatch[1];
            const fieldPath = stringOpMatch[2];
            const op = stringOpMatch[3].toUpperCase();
            const caseInsensitive = /\[c\]/i.test(query);
            const rawValue = this._resolveConditionValue(stringOpMatch[4].trim(), args);

            return entities.filter(entity => {
                const list = this._resolveFieldValue(entity, listProp);
                if (!Array.isArray(list) || list.length === 0) return false;

                return list.some(item => {
                    const fieldValue = this._resolveFieldValue(item, fieldPath);
                    if (fieldValue == null) return false;
                    let fv = String(fieldValue);
                    let rv = String(rawValue);
                    if (caseInsensitive) {
                        fv = fv.toLowerCase();
                        rv = rv.toLowerCase();
                    }
                    switch (op) {
                        case "CONTAINS": return fv.includes(rv);
                        case "BEGINSWITH": return fv.startsWith(rv);
                        case "ENDSWITH": return fv.endsWith(rv);
                        default: return false;
                    }
                });
            });
        }

        // Comparison ops: ANY listProp.field OP value
        const compMatch = query.match(
            /^\s*ANY\s+([\w]+)\.([\w.]+)\s*(==|!=|<>|<=|>=|<|>|=)\s*(.+)$/i
        );
        if (compMatch) {
            const listProp = compMatch[1];
            const fieldPath = compMatch[2];
            const op = compMatch[3];
            const rawValue = this._resolveConditionValue(compMatch[4].trim(), args);

            return entities.filter(entity => {
                const list = this._resolveFieldValue(entity, listProp);
                if (!Array.isArray(list) || list.length === 0) return false;

                return list.some(item => {
                    const fieldValue = this._resolveFieldValue(item, fieldPath);
                    return this._compare(fieldValue, op, rawValue);
                });
            });
        }

        console.warn(`JsFallbackFilterEvaluator: could not parse ANY quantifier: "${query.substring(0, 120)}"`);
        return entities;
    }

    // ──── limit(N) — inline result limit ────

    static _applyLimit(entities, query, args, limitMatch, schemaName) {
        const limitN = parseInt(limitMatch[1], 10);

        // Strip the limit(N) from the query to check if there's a remaining filter
        const remaining = query.replace(/\blimit\s*\(\s*\d+\s*\)/i, "").trim();

        if (remaining.length === 0) {
            // Pure limit — just slice
            return entities.slice(0, limitN);
        }

        // There's a remaining filter clause — apply it first, then limit.
        // This handles partial-parse scenarios where the SQL part was already applied
        // and only the limit clause landed here. But if a compound clause came through
        // as a single fallback (e.g. from a fully-unsupported query), evaluate remaining too.
        const filteredFirst = this._applyOne(entities, {query: remaining, args}, schemaName);
        return filteredFirst.slice(0, limitN);
    }

    // ──── Condition evaluation for SUBQUERY items ────

    /**
     * Evaluate a Realm-style condition string against a single list item.
     * Handles AND/OR, comparisons, string ops, null checks, $N params, nested SUBQUERY.
     */
    static _evaluateConditionString(item, conditions, varName, args) {
        // Check for nested SUBQUERY — warn and return permissive
        if (/SUBQUERY\s*\(/i.test(conditions)) {
            // Try to split on top-level AND/OR and evaluate non-SUBQUERY parts
            const parts = this._splitTopLevel(conditions, "AND");
            let allNonSubqueryPass = true;
            let hasNonSubquery = false;
            for (const part of parts) {
                const trimmed = part.trim();
                if (/SUBQUERY\s*\(/i.test(trimmed)) {
                    // Nested SUBQUERY — skip (permissive)
                    continue;
                }
                hasNonSubquery = true;
                if (!this._evaluateConditionString(item, trimmed, varName, args)) {
                    allNonSubqueryPass = false;
                }
            }
            // If all non-SUBQUERY conditions pass (and there were some), return true
            // If there were none (everything was SUBQUERY), return true (permissive)
            return !hasNonSubquery || allNonSubqueryPass;
        }

        // Split on top-level OR first (lower precedence)
        const orParts = this._splitTopLevel(conditions, "OR");
        if (orParts.length > 1) {
            return orParts.some(part => this._evaluateConditionString(item, part.trim(), varName, args));
        }

        // Split on top-level AND
        const andParts = this._splitTopLevel(conditions, "AND");
        if (andParts.length > 1) {
            return andParts.every(part => this._evaluateConditionString(item, part.trim(), varName, args));
        }

        // Strip outer parens
        const stripped = this._stripParens(conditions.trim());
        if (stripped !== conditions.trim()) {
            return this._evaluateConditionString(item, stripped, varName, args);
        }

        // Single atomic condition
        return this._evaluateAtomicCondition(item, conditions.trim(), varName, args);
    }

    /**
     * Evaluate a single atomic condition like:
     *   $observation.concept.uuid = "abc"
     *   $enrolment.voided = false
     *   $observation.valueJSON contains '"phoneNumber":"xyz"'
     */
    static _evaluateAtomicCondition(item, condition, varName, args) {
        // Try string ops first: CONTAINS, BEGINSWITH, ENDSWITH (with optional [c])
        const stringOpMatch = condition.match(
            /^([\w$.]+(?:\.[\w]+)*)\s+(CONTAINS|BEGINSWITH|ENDSWITH)\s*(?:\[c\])?\s+(.+)$/i
        );
        if (stringOpMatch) {
            const fieldPath = stringOpMatch[1];
            const op = stringOpMatch[2].toUpperCase();
            const caseInsensitive = /\[c\]/i.test(condition);
            const rawValue = this._resolveConditionValue(stringOpMatch[3].trim(), args);
            const fieldValue = this._resolveItemFieldValue(item, fieldPath, varName);

            if (fieldValue == null) return false;
            let fv = String(fieldValue);
            let rv = String(rawValue);
            if (caseInsensitive) {
                fv = fv.toLowerCase();
                rv = rv.toLowerCase();
            }

            switch (op) {
                case "CONTAINS": return fv.includes(rv);
                case "BEGINSWITH": return fv.startsWith(rv);
                case "ENDSWITH": return fv.endsWith(rv);
                default: return false;
            }
        }

        // Comparison ops: =, ==, !=, <>, <, >, <=, >=
        const compMatch = condition.match(
            /^([\w$.]+(?:\.[\w]+)*)\s*(==|!=|<>|<=|>=|<|>|=)\s*(.+)$/
        );
        if (compMatch) {
            const fieldPath = compMatch[1];
            const op = compMatch[2];
            const rawValue = this._resolveConditionValue(compMatch[3].trim(), args);
            const fieldValue = this._resolveItemFieldValue(item, fieldPath, varName);
            return this._compare(fieldValue, op, rawValue);
        }

        console.warn(`JsFallbackFilterEvaluator: could not parse atomic condition: "${condition}"`);
        return true; // permissive on parse failure
    }

    /**
     * Resolve a field path on a list item, stripping the $variable prefix.
     * e.g. "$observation.concept.uuid" with varName "$observation" → item.concept.uuid
     */
    static _resolveItemFieldValue(item, fieldPath, varName) {
        let path = fieldPath;
        // Strip variable prefix (e.g. "$observation." or "$enrolment.")
        if (varName && path.startsWith(varName + ".")) {
            path = path.substring(varName.length + 1);
        } else if (varName && path === varName) {
            return item;
        }
        return this._resolveFieldValue(item, path);
    }

    /**
     * Resolve a value from a condition's RHS.
     * Handles: quoted strings, $N parameters, true/false, null, numbers.
     */
    static _resolveConditionValue(rawValue, args) {
        const trimmed = rawValue.trim();

        // Quoted string (single or double)
        if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
            (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
            return trimmed.substring(1, trimmed.length - 1);
        }

        // Parameter $N
        const paramMatch = trimmed.match(/^\$(\d+)$/);
        if (paramMatch && args) {
            const idx = parseInt(paramMatch[1], 10);
            return idx < args.length ? args[idx] : undefined;
        }

        // Boolean
        if (trimmed.toLowerCase() === "true") return true;
        if (trimmed.toLowerCase() === "false") return false;

        // Null
        if (trimmed.toLowerCase() === "null" || trimmed.toLowerCase() === "nil") return null;

        // Number
        const num = Number(trimmed);
        if (!isNaN(num) && trimmed !== "") return num;

        return trimmed;
    }

    // ──── Utility methods ────

    /**
     * Resolve a dot-notation field path on an entity.
     * e.g. "commentThread.uuid" → entity.commentThread.uuid
     */
    static _resolveFieldValue(entity, dotPath) {
        if (!entity || !dotPath) return undefined;
        const parts = dotPath.split(".");
        let current = entity;
        for (const part of parts) {
            if (current == null) return undefined;
            current = current[part];
        }
        return current;
    }

    /**
     * Split a condition string on a top-level keyword (AND or OR),
     * respecting parentheses and quoted strings.
     */
    static _splitTopLevel(str, keyword) {
        const parts = [];
        let depth = 0;
        let inSingleQuote = false;
        let inDoubleQuote = false;
        let start = 0;
        const upper = str.toUpperCase();
        const kwLen = keyword.length;

        for (let i = 0; i < str.length; i++) {
            const ch = str[i];

            if (ch === "'" && !inDoubleQuote) {
                // Check for escape
                if (i > 0 && str[i - 1] === "\\") continue;
                inSingleQuote = !inSingleQuote;
                continue;
            }
            if (ch === '"' && !inSingleQuote) {
                if (i > 0 && str[i - 1] === "\\") continue;
                inDoubleQuote = !inDoubleQuote;
                continue;
            }
            if (inSingleQuote || inDoubleQuote) continue;

            if (ch === '(' || ch === '[') {
                depth++;
            } else if (ch === ')' || ch === ']') {
                depth--;
            } else if (depth === 0) {
                // Check for keyword at word boundary
                if (upper.substring(i, i + kwLen) === keyword &&
                    (i === 0 || /\s/.test(str[i - 1])) &&
                    (i + kwLen >= str.length || /\s/.test(str[i + kwLen]))) {
                    const part = str.substring(start, i).trim();
                    if (part.length > 0) parts.push(part);
                    start = i + kwLen;
                }
            }
        }

        const last = str.substring(start).trim();
        if (last.length > 0) parts.push(last);

        return parts;
    }

    /**
     * Strip matching outer parentheses if they wrap the entire expression.
     */
    static _stripParens(str) {
        if (!str.startsWith("(") || !str.endsWith(")")) return str;
        let depth = 0;
        for (let i = 0; i < str.length - 1; i++) {
            if (str[i] === '(') depth++;
            else if (str[i] === ')') depth--;
            if (depth === 0) return str; // Closing paren before the end — not wrapping
        }
        return str.substring(1, str.length - 1);
    }

    static _compareCount(actual, operator, expected) {
        const op = operator === "==" ? "=" : operator;
        switch (op) {
            case "=": return actual === expected;
            case "!=":
            case "<>": return actual !== expected;
            case "<": return actual < expected;
            case ">": return actual > expected;
            case "<=": return actual <= expected;
            case ">=": return actual >= expected;
            default: return false;
        }
    }

    static _compare(fieldValue, operator, expected) {
        const op = operator === "==" ? "=" : operator;

        // Null comparison
        if (expected === null || expected === undefined) {
            if (op === "=" ) return fieldValue == null;
            if (op === "!=" || op === "<>") return fieldValue != null;
            return false;
        }
        if (fieldValue == null) {
            if (op === "=" ) return expected == null;
            if (op === "!=" || op === "<>") return expected != null;
            return false;
        }

        // Boolean comparison — field may be stored as 0/1
        if (typeof expected === "boolean") {
            const fv = (fieldValue === true || fieldValue === 1 || fieldValue === "true");
            return op === "=" ? fv === expected :
                   (op === "!=" || op === "<>") ? fv !== expected : false;
        }

        // String or number comparison
        switch (op) {
            case "=": return fieldValue == expected; // loose equality for type coercion
            case "!=":
            case "<>": return fieldValue != expected;
            case "<": return fieldValue < expected;
            case ">": return fieldValue > expected;
            case "<=": return fieldValue <= expected;
            case ">=": return fieldValue >= expected;
            default: return false;
        }
    }
}

export default JsFallbackFilterEvaluator;
