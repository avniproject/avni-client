/**
 * JsFallbackFilterEvaluator - Post-filters hydrated entities for Realm query
 * patterns that can't be translated to SQL.
 *
 * Supported patterns:
 *   - TRUEPREDICATE DISTINCT(field) — deduplication by field value
 *   - SUBQUERY(listProp, $var, conds).@count OP N — sub-filtering on list properties,
 *     including dotted list paths (enrolments.encounters), which resolve to the union
 *   - listProp.@count OP N / listProp.@size OP N — collection size check
 *   - ANY listProp.field OP value — quantifier over list elements
 *   - compound clauses: AND / OR / NOT (and &&, ||, !) over any of the above
 *   - trailing SORT(field dir, …) — orders the result set
 *   - limit(N) — inline result limit (applied as slice after other filters)
 *   - bare TRUEPREDICATE — matches everything
 *
 * Anything else — including @links, and recognized patterns whose innards fail to
 * parse — throws UnsupportedRealmQueryError rather than silently returning the
 * full or empty set (#1981).
 */
import {UnsupportedRealmQueryError} from "./RealmQueryParser";

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
        let trimmed = query.trim();

        // TRUEPREDICATE DISTINCT(field)
        if (/TRUEPREDICATE/i.test(trimmed) && /DISTINCT\s*\(/i.test(trimmed)) {
            return this._applyDistinct(entities, trimmed, args, schemaName);
        }

        // @links.@count — inverse relationships aren't evaluable client-side. Fail loud like the
        // terminal branch rather than silently returning [] (matching nobody is as wrong as matching
        // everybody). No active caller relies on the empty degradation (#1981).
        if (/@links/i.test(trimmed)) {
            throw new UnsupportedRealmQueryError(trimmed, `@links (inverse relationship) not evaluable for ${schemaName}`);
        }

        // A trailing SORT(...) orders the result set; it isn't part of the predicate.
        let sortBody = null;
        const sortMatch = trimmed.match(/\bSORT\s*\(([^)]*)\)\s*$/i);
        if (sortMatch) {
            sortBody = sortMatch[1];
            trimmed = trimmed.slice(0, sortMatch.index).trim();
            if (trimmed.length === 0) return this._applySort(entities, sortBody, schemaName);
        }

        const filtered = this._applyPredicate(entities, trimmed, args, schemaName);
        return sortBody ? this._applySort(filtered, sortBody, schemaName) : filtered;
    }

    static _applyPredicate(entities, trimmed, args, schemaName) {
        // A compound clause (top-level AND/OR/NOT) can't be reduced to one of the single-shape
        // branches below — evaluating only the shape it recognises silently drops the rest of
        // the expression, so route the whole thing through the per-entity evaluator (#1978).
        if (this._isCompound(trimmed)) {
            // Validate up front: OR short-circuits, so an unevaluable branch behind a matching
            // one would otherwise never be reached and never fail loud.
            this._assertEvaluable(trimmed, null, schemaName);
            return entities.filter(entity => this._evaluateConditionString(entity, trimmed, null, args, schemaName));
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
            return this._applyAnyQuantifier(entities, trimmed, args, schemaName);
        }

        // limit(N) — inline result limit
        const limitMatch = trimmed.match(/\blimit\s*\(\s*(\d+)\s*\)/i);
        if (limitMatch) {
            return this._applyLimit(entities, trimmed, args, limitMatch, schemaName);
        }

        // A bare TRUEPREDICATE means "match everything" — the full set IS the correct answer here,
        // so return it rather than failing loud. (Decorated forms — DISTINCT/SORT — are handled
        // above or translated to SQL; a TRUEPREDICATE limit(N) reaches here via _applyLimit's
        // recursion with the limit already stripped.)
        if (/^TRUEPREDICATE$/i.test(trimmed)) {
            return entities;
        }

        // Fail loud rather than silently returning the full, unfiltered set — a screening/
        // eligibility rule that returns everything is the worst failure mode (#1981).
        throw new UnsupportedRealmQueryError(trimmed, `unrecognized fallback query for ${schemaName}`);
    }

    /**
     * Walk an expression and throw on anything the evaluator can't evaluate. Runs once,
     * before filtering, so the outcome doesn't depend on which branches short-circuit or
     * on whether a given entity's lists happen to be empty.
     */
    static _assertEvaluable(expr, varName, schemaName) {
        const trimmed = expr.trim();

        const stripped = this._stripParens(trimmed);
        if (stripped !== trimmed) return this._assertEvaluable(stripped, varName, schemaName);

        for (const op of ["OR", "AND"]) {
            const parts = this._splitTopLevel(trimmed, op);
            if (parts.length > 1) {
                parts.forEach(part => this._assertEvaluable(part, varName, schemaName));
                return;
            }
        }

        const notMatch = trimmed.match(/^(?:NOT\b|!)\s*([\s\S]+)$/i);
        if (notMatch) return this._assertEvaluable(notMatch[1], varName, schemaName);

        if (/^SUBQUERY\s*\(/i.test(trimmed)) {
            const parsed = this._parseSubquery(trimmed);
            if (!parsed) {
                throw new UnsupportedRealmQueryError(trimmed, `could not parse SUBQUERY for ${schemaName}`);
            }
            return this._assertEvaluable(parsed.conditions, parsed.varName, schemaName);
        }

        if (/^([\w$]+(?:\.[\w]+)*)\.@(?:count|size)\s*(==|!=|<>|<=|>=|<|>|=)\s*(\d+)$/i.test(trimmed)) return;
        if (/^TRUEPREDICATE$/i.test(trimmed)) return;
        if (this._atomicConditionShape(trimmed)) return;

        throw new UnsupportedRealmQueryError(trimmed, `could not parse atomic condition for ${schemaName}`);
    }

    static _isCompound(expr) {
        const stripped = this._stripParens(expr.trim());
        return this._splitTopLevel(stripped, "OR").length > 1
            || this._splitTopLevel(stripped, "AND").length > 1
            || /^(?:NOT\b|!)/i.test(stripped);
    }

    // ──── SORT(field dir, …) ────

    static _applySort(entities, sortBody, schemaName) {
        const keys = sortBody.split(",")
            .map(k => k.trim())
            .filter(Boolean)
            .map(k => {
                const m = k.match(/^([\w.]+)(?:\s+(asc|desc))?$/i);
                return m ? {field: m[1], desc: (m[2] || "").toUpperCase() === "DESC"} : null;
            });
        if (keys.length === 0 || keys.some(k => k === null)) {
            throw new UnsupportedRealmQueryError(sortBody, `could not parse SORT keys for ${schemaName}`);
        }
        return [...entities].sort((a, b) => {
            for (const {field, desc} of keys) {
                const va = this._resolveFieldValue(a, field);
                const vb = this._resolveFieldValue(b, field);
                if (va == null && vb == null) continue;
                if (va == null) return desc ? 1 : -1;
                if (vb == null) return desc ? -1 : 1;
                if (va < vb) return desc ? 1 : -1;
                if (va > vb) return desc ? -1 : 1;
            }
            return 0;
        });
    }

    // ──── TRUEPREDICATE DISTINCT(field) ────

    static _applyDistinct(entities, query, args, schemaName) {
        // Extract DISTINCT(field) — field may contain dots
        const distinctMatch = query.match(/DISTINCT\s*\(\s*([\w.]+)\s*\)/i);
        if (!distinctMatch) {
            // Recognized as DISTINCT but the field didn't parse — fail loud rather than return the
            // full unfiltered set (silent-wrong is the failure #1981 kills, in any branch).
            throw new UnsupportedRealmQueryError(query, `could not parse DISTINCT field for ${schemaName}`);
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
        // Validate before filtering: conditions are only reached for entities with a non-empty
        // list, so a lazy check would throw or not depending on the data in front of it.
        this._assertEvaluable(query, null, schemaName);
        return entities.filter(entity => this._evaluateSubquery(entity, query, null, args, schemaName));
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
        const {args: argStrs, closeIdx} = this._splitSubqueryArgs(query, openIdx);
        if (!argStrs || argStrs.length < 3 || closeIdx < 0) return null;

        const listProp = argStrs[0].trim();
        const varName = argStrs[1].trim(); // e.g. "$observation"
        const conditions = argStrs[2].trim();

        // After the closing paren, expect .@count OP N
        const tail = query.substring(closeIdx + 1).trim();
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
     * Split SUBQUERY arguments (listProp, $var, conditions) respecting nested parens
     * and quoted values. Returns the args plus the index of the SUBQUERY's closing
     * paren (-1 if unterminated) so the caller doesn't have to rescan for it.
     */
    static _splitSubqueryArgs(query, startIdx) {
        const args = [];
        let depth = 0;
        let current = "";
        let quote = null;

        for (let i = startIdx; i < query.length; i++) {
            const ch = query[i];
            // Commas and parens inside a quoted value are data, not structure.
            if (quote) {
                current += ch;
                if (ch === quote && query[i - 1] !== "\\") quote = null;
                continue;
            }
            if (ch === "'" || ch === '"') { quote = ch; current += ch; continue; }
            if (ch === '(' || ch === '{') {
                // '{' groups an IN {…} value-list; its commas are data, not arg separators.
                depth++;
                current += ch;
            } else if (ch === '}') {
                if (depth > 0) depth--;
                current += ch;
            } else if (ch === ')') {
                if (depth === 0) {
                    // End of SUBQUERY args
                    if (current.trim()) args.push(current);
                    return {args, closeIdx: i};
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
        return {args, closeIdx: -1};
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

    static _applyAnyQuantifier(entities, query, args, schemaName) {
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
            const rawValue = this._resolveConditionValue(stringOpMatch[4].trim(), args, schemaName);

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
            const rawValue = this._resolveConditionValue(compMatch[4].trim(), args, schemaName);

            return entities.filter(entity => {
                const list = this._resolveFieldValue(entity, listProp);
                if (!Array.isArray(list) || list.length === 0) return false;

                return list.some(item => {
                    const fieldValue = this._resolveFieldValue(item, fieldPath);
                    return this._compare(fieldValue, op, rawValue);
                });
            });
        }

        // Recognized as ANY but couldn't parse it — fail loud rather than return the full set (#1981).
        throw new UnsupportedRealmQueryError(query, `could not parse ANY quantifier for ${schemaName}`);
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

        // There's a remaining filter clause — apply it first, then limit. A recognized remaining
        // (e.g. "listProp.@count > 0 limit(5)", or "TRUEPREDICATE limit(N)") is evaluated then
        // sliced; an unrecognized remaining now fails loud through this recursion rather than
        // silently slicing the full unfiltered set (#1981).
        const filteredFirst = this._applyOne(entities, {query: remaining, args}, schemaName);
        return filteredFirst.slice(0, limitN);
    }

    // ──── Condition evaluation for SUBQUERY items ────

    /**
     * Evaluate a Realm-style condition string against a single list item.
     * Handles AND/OR, comparisons, string ops, null checks, $N params, nested SUBQUERY.
     */
    static _evaluateConditionString(item, conditions, varName, args, schemaName) {
        const trimmed = conditions.trim();

        const stripped = this._stripParens(trimmed);
        if (stripped !== trimmed) {
            return this._evaluateConditionString(item, stripped, varName, args, schemaName);
        }

        // OR binds loosest, then AND, then NOT — split in that order.
        const orParts = this._splitTopLevel(trimmed, "OR");
        if (orParts.length > 1) {
            return orParts.some(part => this._evaluateConditionString(item, part, varName, args, schemaName));
        }

        const andParts = this._splitTopLevel(trimmed, "AND");
        if (andParts.length > 1) {
            return andParts.every(part => this._evaluateConditionString(item, part, varName, args, schemaName));
        }

        const notMatch = trimmed.match(/^(?:NOT\b|!)\s*([\s\S]+)$/i);
        if (notMatch) {
            return !this._evaluateConditionString(item, notMatch[1], varName, args, schemaName);
        }

        if (/^SUBQUERY\s*\(/i.test(trimmed)) {
            return this._evaluateSubquery(item, trimmed, varName, args, schemaName);
        }

        const listCountMatch = trimmed.match(/^([\w$]+(?:\.[\w]+)*)\.@(?:count|size)\s*(==|!=|<>|<=|>=|<|>|=)\s*(\d+)$/i);
        if (listCountMatch) {
            const list = this._resolveItemFieldValue(item, listCountMatch[1], varName);
            const len = Array.isArray(list) ? list.length : 0;
            return this._compareCount(len, listCountMatch[2], parseInt(listCountMatch[3], 10));
        }

        if (/^TRUEPREDICATE$/i.test(trimmed)) return true;

        return this._evaluateAtomicCondition(item, trimmed, varName, args, schemaName);
    }

    /**
     * Evaluate `SUBQUERY(listProp, $var, conds).@count OP N` against one object — an entity
     * at the top level, or a list element when nested inside another SUBQUERY's conditions.
     */
    static _evaluateSubquery(item, expr, outerVarName, args, schemaName) {
        const parsed = this._parseSubquery(expr);
        if (!parsed) {
            // Skipping an unparseable SUBQUERY would silently count every element as
            // matching — fail loud like the other branches (#1981).
            throw new UnsupportedRealmQueryError(expr, `could not parse SUBQUERY for ${schemaName}`);
        }
        const {listProp, varName, conditions, operator, count} = parsed;
        const list = this._resolveItemFieldValue(item, listProp, outerVarName);
        if (!Array.isArray(list)) return this._compareCount(0, operator, count);

        let matchCount = 0;
        for (const element of list) {
            if (this._evaluateConditionString(element, conditions, varName, args, schemaName)) {
                matchCount++;
            }
        }
        return this._compareCount(matchCount, operator, count);
    }

    /**
     * Evaluate a single atomic condition like:
     *   $observation.concept.uuid = "abc"
     *   $enrolment.voided = false
     *   $observation.valueJSON contains '"phoneNumber":"xyz"'
     */
    static _evaluateAtomicCondition(item, condition, varName, args, schemaName) {
        const shape = this._atomicConditionShape(condition);
        if (shape && shape.kind === "stringOp") {
            const {fieldPath, op} = shape;
            const caseInsensitive = /\[c\]/i.test(condition);
            const rawValue = this._resolveConditionValue(shape.rhs, args, schemaName);
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

        if (shape && shape.kind === "comparison") {
            const rawValue = this._resolveConditionValue(shape.rhs, args, schemaName);
            const fieldValue = this._resolveItemFieldValue(item, shape.fieldPath, varName);
            return this._compare(fieldValue, shape.op, rawValue);
        }

        // field IN {v1, v2, …} — membership. Matches if the field equals any listed value.
        if (shape && shape.kind === "in") {
            const fieldValue = this._resolveItemFieldValue(item, shape.fieldPath, varName);
            return shape.values.some(raw => this._compare(fieldValue, "==", this._resolveConditionValue(raw, args, schemaName)));
        }

        // Treating an unparseable condition as matching would silently inflate .@count and
        // include rows that don't qualify — fail loud like every other branch (#1981).
        throw new UnsupportedRealmQueryError(condition, `could not parse atomic condition for ${schemaName}`);
    }

    /**
     * Recognise a single atomic condition — a string op or a comparison. Shared by the
     * evaluator and the up-front evaluability check so the two can't drift apart.
     */
    static _atomicConditionShape(condition) {
        const stringOp = condition.match(
            /^([\w$.]+(?:\.[\w]+)*)\s+(CONTAINS|BEGINSWITH|ENDSWITH)\s*(?:\[c\])?\s+(.+)$/i
        );
        if (stringOp && this._isValueShape(stringOp[3])) {
            return {kind: "stringOp", fieldPath: stringOp[1], op: stringOp[2].toUpperCase(), rhs: stringOp[3].trim()};
        }
        const inList = condition.match(
            /^([\w$.]+(?:\.[\w]+)*)\s+IN\s+\{([^}]*)\}$/i
        );
        if (inList) {
            const values = inList[2].split(",").map(v => v.trim()).filter(v => v.length > 0);
            if (values.length > 0 && values.every(v => this._isValueShape(v))) {
                return {kind: "in", fieldPath: inList[1], values};
            }
        }
        const comparison = condition.match(
            /^([\w$.]+(?:\.[\w]+)*)\s*(==|!=|<>|<=|>=|<|>|=)\s*(.+)$/
        );
        // Reject a garbage RHS at shape-detection time so a half-split compound (e.g.
        // "concept.uuid == 'c1' AND") fails the up-front _assertEvaluable check rather than
        // silently comparing a raw fragment inside the per-entity loop (#1981).
        if (comparison && this._isValueShape(comparison[3])) {
            return {kind: "comparison", fieldPath: comparison[1], op: comparison[2], rhs: comparison[3].trim()};
        }
        return null;
    }

    // The RHS forms _resolveConditionValue can resolve — kept in step with it so shape-detection
    // and evaluation agree. A bare identifier is whitelisted (may be an unquoted value in some inputs).
    static _isValueShape(rhs) {
        const t = rhs.trim();
        return (t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))
            || /^\$\d+$/.test(t)
            || /^(true|false|null|nil)$/i.test(t)
            || (t !== "" && !isNaN(Number(t)))
            || /^[\w$.]+$/.test(t);
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
    static _resolveConditionValue(rawValue, args, schemaName) {
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

        // A bare identifier (no quotes/spaces/operators) may be an unquoted value in some inputs —
        // preserve the prior lenient behaviour. Anything else matched no literal form and is unparsed
        // garbage (e.g. "'c1' AND", a half-split compound) — fail loud rather than compare a raw
        // fragment and silently match nobody (#1981).
        if (/^[\w$.]+$/.test(trimmed)) return trimmed;
        throw new UnsupportedRealmQueryError(rawValue, `could not resolve condition value for ${schemaName}`);
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
        for (let i = 0; i < parts.length; i++) {
            if (current == null) return undefined;
            // A list hop mid-path (enrolments.encounters) means "the union over the list",
            // which is what Realm does — resolve the remainder against each element.
            if (Array.isArray(current)) {
                const rest = parts.slice(i).join(".");
                return current.flatMap(item => {
                    const v = this._resolveFieldValue(item, rest);
                    if (v === undefined || v === null) return [];
                    return Array.isArray(v) ? v : [v];
                });
            }
            current = current[parts[i]];
        }
        return current;
    }

    // Realm accepts && and || as synonyms for AND / OR.
    static _symbolFor(keyword) {
        return keyword === "AND" ? "&&" : keyword === "OR" ? "||" : null;
    }

    /**
     * Split a condition string on a top-level keyword (AND or OR) or its symbol form
     * (&& / ||), respecting parentheses and quoted strings.
     */
    static _splitTopLevel(str, keyword) {
        const parts = [];
        let depth = 0;
        let inSingleQuote = false;
        let inDoubleQuote = false;
        let start = 0;
        const upper = str.toUpperCase();
        const kwLen = keyword.length;
        const symbol = this._symbolFor(keyword);

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
                } else if (symbol && str.startsWith(symbol, i)) {
                    const part = str.substring(start, i).trim();
                    if (part.length > 0) parts.push(part);
                    start = i + symbol.length;
                    i += symbol.length - 1;
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
