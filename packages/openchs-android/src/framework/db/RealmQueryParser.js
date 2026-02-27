/**
 * RealmQueryParser - Translates Realm query strings to SQL WHERE clauses.
 *
 * Supported Realm query features:
 * - Comparison operators: =, ==, !=, <>, <, >, <=, >=
 * - String operators: CONTAINS, BEGINSWITH, ENDSWITH, LIKE (with [c] case-insensitive modifier)
 * - Logical operators: AND, OR, NOT
 * - Parentheses for grouping
 * - Parameter substitution: $0, $1, ... $N
 * - Dot-notation paths (e.g., individual.uuid) → generate JOINs
 * - null comparison
 * - String literals with single or double quotes
 * - Boolean literals: true, false
 *
 * Patterns routed to JS fallback (JsFallbackFilterEvaluator):
 * - TRUEPREDICATE DISTINCT(field) — post-hydration deduplication
 * - SUBQUERY(listProp, $var, conds).@count OP N — list sub-filtering
 * - listProp.@count / @size OP N — collection size check
 * - ANY listProp.field OP value — quantifier over list elements
 * - limit(N) — inline result limit
 * - @links.@count — inverse relationships (not evaluable, returns empty)
 * - ALL, NONE quantifiers, @sum/@avg/@min/@max aggregates (unused in codebase)
 */

import _ from "lodash";

const TOKEN_TYPES = {
    STRING: "STRING",
    NUMBER: "NUMBER",
    BOOLEAN: "BOOLEAN",
    NULL: "NULL",
    IDENTIFIER: "IDENTIFIER",
    PARAMETER: "PARAMETER",
    OPERATOR: "OPERATOR",
    COMPARISON: "COMPARISON",
    LPAREN: "LPAREN",
    RPAREN: "RPAREN",
    AND: "AND",
    OR: "OR",
    NOT: "NOT",
    STRING_OP: "STRING_OP",
};

class Token {
    constructor(type, value) {
        this.type = type;
        this.value = value;
    }
}

class UnsupportedRealmQueryError extends Error {
    constructor(query, reason) {
        super(`Unsupported Realm query: ${reason} in "${query}"`);
        this.name = "UnsupportedRealmQueryError";
        this.query = query;
        this.reason = reason;
    }
}

// ──────────────── Tokenizer ────────────────

function tokenize(query) {
    const tokens = [];
    let i = 0;
    const len = query.length;

    while (i < len) {
        // Skip whitespace
        if (/\s/.test(query[i])) {
            i++;
            continue;
        }

        // Parentheses
        if (query[i] === "(") {
            tokens.push(new Token(TOKEN_TYPES.LPAREN, "("));
            i++;
            continue;
        }
        if (query[i] === ")") {
            tokens.push(new Token(TOKEN_TYPES.RPAREN, ")"));
            i++;
            continue;
        }

        // String literals (single or double quoted)
        if (query[i] === '"' || query[i] === "'") {
            const quote = query[i];
            let str = "";
            i++; // skip opening quote
            while (i < len && query[i] !== quote) {
                if (query[i] === "\\" && i + 1 < len) {
                    str += query[i + 1];
                    i += 2;
                } else {
                    str += query[i];
                    i++;
                }
            }
            i++; // skip closing quote
            tokens.push(new Token(TOKEN_TYPES.STRING, str));
            continue;
        }

        // Parameter substitution ($0, $1, etc.)
        if (query[i] === "$") {
            let num = "";
            i++; // skip $
            while (i < len && /\d/.test(query[i])) {
                num += query[i];
                i++;
            }
            tokens.push(new Token(TOKEN_TYPES.PARAMETER, parseInt(num, 10)));
            continue;
        }

        // Two-character comparison operators
        if (i + 1 < len) {
            const two = query[i] + query[i + 1];
            if (two === "<=" || two === ">=" || two === "!=" || two === "<>" || two === "==") {
                tokens.push(new Token(TOKEN_TYPES.COMPARISON, two === "==" ? "=" : two));
                i += 2;
                continue;
            }
        }

        // Single-character comparison operators
        if (query[i] === "=" || query[i] === "<" || query[i] === ">") {
            tokens.push(new Token(TOKEN_TYPES.COMPARISON, query[i]));
            i++;
            continue;
        }

        // Numbers (including negative and decimal)
        if (/[\d]/.test(query[i]) || (query[i] === "-" && i + 1 < len && /\d/.test(query[i + 1]))) {
            let num = "";
            if (query[i] === "-") {
                num = "-";
                i++;
            }
            while (i < len && /[\d.]/.test(query[i])) {
                num += query[i];
                i++;
            }
            tokens.push(new Token(TOKEN_TYPES.NUMBER, parseFloat(num)));
            continue;
        }

        // Identifiers and keywords
        if (/[a-zA-Z_@]/.test(query[i])) {
            let ident = "";
            while (i < len && /[a-zA-Z0-9_.\-@]/.test(query[i])) {
                ident += query[i];
                i++;
            }

            const upper = ident.toUpperCase();

            // Check for [c] modifier following string operators
            if (["CONTAINS", "BEGINSWITH", "ENDSWITH", "LIKE"].includes(upper)) {
                let caseInsensitive = false;
                // Check for [c] modifier
                const remaining = query.substring(i);
                const ciMatch = remaining.match(/^\s*\[c\]/i);
                if (ciMatch) {
                    caseInsensitive = true;
                    i += ciMatch[0].length;
                }
                tokens.push(new Token(TOKEN_TYPES.STRING_OP, {op: upper, caseInsensitive}));
                continue;
            }

            if (upper === "AND") {
                tokens.push(new Token(TOKEN_TYPES.AND, "AND"));
            } else if (upper === "OR") {
                tokens.push(new Token(TOKEN_TYPES.OR, "OR"));
            } else if (upper === "NOT") {
                tokens.push(new Token(TOKEN_TYPES.NOT, "NOT"));
            } else if (upper === "TRUE") {
                tokens.push(new Token(TOKEN_TYPES.BOOLEAN, true));
            } else if (upper === "FALSE") {
                tokens.push(new Token(TOKEN_TYPES.BOOLEAN, false));
            } else if (upper === "NULL" || upper === "NIL") {
                tokens.push(new Token(TOKEN_TYPES.NULL, null));
            } else {
                tokens.push(new Token(TOKEN_TYPES.IDENTIFIER, ident));
            }
            continue;
        }

        // Unknown character — skip
        i++;
    }

    return tokens;
}

// ──────────────── Parser → AST ────────────────

class Parser {
    constructor(tokens) {
        this.tokens = tokens;
        this.pos = 0;
    }

    peek() {
        return this.pos < this.tokens.length ? this.tokens[this.pos] : null;
    }

    consume(expectedType) {
        const token = this.tokens[this.pos];
        if (expectedType && token?.type !== expectedType) {
            throw new Error(`Expected ${expectedType} but got ${token?.type} (${token?.value}) at position ${this.pos}`);
        }
        this.pos++;
        return token;
    }

    parse() {
        const result = this.parseOr();
        return result;
    }

    parseOr() {
        let left = this.parseAnd();
        while (this.peek()?.type === TOKEN_TYPES.OR) {
            this.consume();
            const right = this.parseAnd();
            left = {type: "OR", left, right};
        }
        return left;
    }

    parseAnd() {
        let left = this.parseNot();
        while (this.peek()?.type === TOKEN_TYPES.AND) {
            this.consume();
            const right = this.parseNot();
            left = {type: "AND", left, right};
        }
        return left;
    }

    parseNot() {
        if (this.peek()?.type === TOKEN_TYPES.NOT) {
            this.consume();
            const expr = this.parsePrimary();
            return {type: "NOT", expr};
        }
        return this.parsePrimary();
    }

    parsePrimary() {
        const token = this.peek();

        // Grouped expression
        if (token?.type === TOKEN_TYPES.LPAREN) {
            this.consume();
            const expr = this.parseOr();
            this.consume(TOKEN_TYPES.RPAREN);
            return expr;
        }

        // Must be a comparison: identifier COMPARISON value, or identifier STRING_OP value
        if (token?.type === TOKEN_TYPES.IDENTIFIER) {
            const field = this.consume().value;
            const opToken = this.peek();

            if (opToken?.type === TOKEN_TYPES.COMPARISON) {
                const op = this.consume().value;
                const value = this.parseValue();
                return {type: "COMPARISON", field, op, value};
            }

            if (opToken?.type === TOKEN_TYPES.STRING_OP) {
                const {op, caseInsensitive} = this.consume().value;
                const value = this.parseValue();
                return {type: "STRING_OP", field, op, value, caseInsensitive};
            }

            throw new Error(`Unexpected token after identifier "${field}": ${opToken?.type} ${opToken?.value}`);
        }

        throw new Error(`Unexpected token: ${token?.type} ${token?.value} at position ${this.pos}`);
    }

    parseValue() {
        const token = this.peek();
        if (!token) throw new Error("Unexpected end of query");

        if (token.type === TOKEN_TYPES.STRING ||
            token.type === TOKEN_TYPES.NUMBER ||
            token.type === TOKEN_TYPES.BOOLEAN ||
            token.type === TOKEN_TYPES.NULL ||
            token.type === TOKEN_TYPES.PARAMETER) {
            return this.consume();
        }

        throw new Error(`Expected value but got ${token.type} (${token.value})`);
    }
}

// ──────────────── AST → SQL ────────────────

class SqlGenerator {
    constructor(schemaMap, rootSchemaName, args) {
        this.schemaMap = schemaMap; // Map<schemaName, schema>
        this.rootSchemaName = rootSchemaName;
        this.args = args || [];
        this.params = [];
        this.joins = [];
        this.joinAliases = new Map(); // dot-path → alias
        this.aliasCounter = 0;
    }

    generate(ast) {
        const where = this.visitNode(ast);
        return {
            where,
            params: this.params,
            joins: this.joins,
        };
    }

    visitNode(node) {
        switch (node.type) {
            case "AND":
                return `(${this.visitNode(node.left)} AND ${this.visitNode(node.right)})`;
            case "OR":
                return `(${this.visitNode(node.left)} OR ${this.visitNode(node.right)})`;
            case "NOT":
                return `NOT (${this.visitNode(node.expr)})`;
            case "COMPARISON":
                return this.visitComparison(node);
            case "STRING_OP":
                return this.visitStringOp(node);
            default:
                throw new Error(`Unknown AST node type: ${node.type}`);
        }
    }

    resolveField(fieldPath) {
        const parts = fieldPath.split(".");
        if (parts.length === 1) {
            // Simple field on root table - convert camelCase to snake_case for column name
            return {column: `t0."${camelToSnake(parts[0])}"`, needsJoin: false};
        }

        // Dot-notation: resolve through schema relationships
        let currentSchema = this.rootSchemaName;
        let currentAlias = "t0";
        let pathSoFar = "";

        for (let i = 0; i < parts.length - 1; i++) {
            const propName = parts[i];
            pathSoFar = pathSoFar ? `${pathSoFar}.${propName}` : propName;

            if (this.joinAliases.has(pathSoFar)) {
                currentAlias = this.joinAliases.get(pathSoFar);
                const schema = this.schemaMap.get(currentSchema);
                if (schema) {
                    const propSchema = schema.properties[propName];
                    if (propSchema?.objectType) {
                        currentSchema = propSchema.objectType;
                    }
                }
                continue;
            }

            const schema = this.schemaMap.get(currentSchema);
            if (!schema) {
                // Schema not found — fall back to simple column reference
                return {column: `t0."${camelToSnake(fieldPath.replace(/\./g, "_"))}"`, needsJoin: false};
            }

            const propSchema = schema.properties[propName];
            if (!propSchema || propSchema.type !== "object") {
                // Not a relationship — treat as a nested column name
                return {column: `${currentAlias}."${camelToSnake(propName)}"`, needsJoin: false};
            }

            const targetSchema = propSchema.objectType;
            const newAlias = `t${++this.aliasCounter}`;
            const targetTableName = schemaNameToTableName(targetSchema);
            const fkColumn = `${camelToSnake(propName)}_uuid`;

            this.joins.push({
                table: targetTableName,
                alias: newAlias,
                on: `${currentAlias}."${fkColumn}" = ${newAlias}."uuid"`,
            });

            this.joinAliases.set(pathSoFar, newAlias);
            currentAlias = newAlias;
            currentSchema = targetSchema;
        }

        const lastPart = parts[parts.length - 1];
        return {column: `${currentAlias}."${camelToSnake(lastPart)}"`, needsJoin: true};
    }

    resolveValue(valueToken) {
        if (valueToken.type === TOKEN_TYPES.PARAMETER) {
            const idx = valueToken.value;
            if (idx >= this.args.length) {
                throw new Error(`Parameter $${idx} referenced but only ${this.args.length} args provided`);
            }
            const val = this.args[idx];
            // Convert Date to epoch ms for SQLite
            if (val instanceof Date) {
                this.params.push(val.getTime());
            } else {
                this.params.push(val);
            }
            return "?";
        }
        if (valueToken.type === TOKEN_TYPES.NULL) {
            return null; // handled specially in comparison
        }
        if (valueToken.type === TOKEN_TYPES.BOOLEAN) {
            this.params.push(valueToken.value ? 1 : 0);
            return "?";
        }
        if (valueToken.type === TOKEN_TYPES.NUMBER) {
            this.params.push(valueToken.value);
            return "?";
        }
        if (valueToken.type === TOKEN_TYPES.STRING) {
            this.params.push(valueToken.value);
            return "?";
        }
        throw new Error(`Unknown value token type: ${valueToken.type}`);
    }

    visitComparison(node) {
        const {column} = this.resolveField(node.field);
        const op = node.op === "<>" ? "!=" : node.op;

        if (node.value.type === TOKEN_TYPES.NULL) {
            return op === "=" ? `${column} IS NULL` : `${column} IS NOT NULL`;
        }

        const valuePlaceholder = this.resolveValue(node.value);
        return `${column} ${op} ${valuePlaceholder}`;
    }

    visitStringOp(node) {
        const {column} = this.resolveField(node.field);
        const valuePlaceholder = this.resolveValue(node.value);
        const ci = node.caseInsensitive;

        // For case-insensitive, we wrap in LOWER()
        const col = ci ? `LOWER(${column})` : column;
        // If case-insensitive, we also need to lowercase the parameter
        if (ci && this.params.length > 0) {
            const lastIdx = this.params.length - 1;
            if (typeof this.params[lastIdx] === "string") {
                this.params[lastIdx] = this.params[lastIdx].toLowerCase();
            }
        }

        switch (node.op) {
            case "CONTAINS":
                // Replace the last param with a LIKE pattern
                if (this.params.length > 0) {
                    const lastIdx = this.params.length - 1;
                    this.params[lastIdx] = `%${this.params[lastIdx]}%`;
                }
                return `${col} LIKE ?`;
            case "BEGINSWITH":
                if (this.params.length > 0) {
                    const lastIdx = this.params.length - 1;
                    this.params[lastIdx] = `${this.params[lastIdx]}%`;
                }
                return `${col} LIKE ?`;
            case "ENDSWITH":
                if (this.params.length > 0) {
                    const lastIdx = this.params.length - 1;
                    this.params[lastIdx] = `%${this.params[lastIdx]}`;
                }
                return `${col} LIKE ?`;
            case "LIKE":
                // Realm LIKE uses * and ? as wildcards; SQL uses % and _
                if (this.params.length > 0) {
                    const lastIdx = this.params.length - 1;
                    if (typeof this.params[lastIdx] === "string") {
                        this.params[lastIdx] = this.params[lastIdx]
                            .replace(/%/g, "\\%")
                            .replace(/_/g, "\\_")
                            .replace(/\*/g, "%")
                            .replace(/\?/g, "_");
                    }
                }
                return `${col} LIKE ? ESCAPE '\\'`;
            default:
                throw new Error(`Unknown string operator: ${node.op}`);
        }
    }
}

// ──────────────── Utilities ────────────────

function camelToSnake(str) {
    return str
        .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")   // ABCDef → ABC_Def
        .replace(/([a-z\d])([A-Z])/g, "$1_$2")        // abcDef → abc_Def
        .toLowerCase();
}

function schemaNameToTableName(schemaName) {
    return camelToSnake(schemaName);
}

/**
 * Strip the "?" optional suffix from Realm type shorthand.
 * e.g., "date?" → "date", "string?" → "string", "date" → "date"
 */
function normalizeRealmType(realmType) {
    if (typeof realmType === "string" && realmType.endsWith("?")) {
        return realmType.slice(0, -1);
    }
    return realmType;
}

// ──────────────── JS fallback detection ────────────────
//
// Patterns that can't be translated to SQL directly.
// When detected, the query (or clause) is routed to JsFallbackFilterEvaluator
// for post-filtering on hydrated entities in JavaScript.

const JS_FALLBACK_PATTERNS = [
    /SUBQUERY\s*\(/i,           // SUBQUERY(list, $var, conds).@count OP N
    /TRUEPREDICATE/i,           // TRUEPREDICATE DISTINCT(field)
    /@links/i,                  // @links.@count (inverse relationships — not evaluable)
    /@count/i,                  // listProp.@count OP N
    /@size/i,                   // listProp.@size OP N (same as @count)
    /@sum/i,                    // collection aggregates (unused in codebase)
    /@avg/i,
    /@min/i,
    /@max/i,
    /\bANY\b/i,                // ANY listProp.field OP value
    /\bALL\b/i,                // ALL/NONE quantifiers (unused in codebase)
    /\bNONE\b/i,
    // limit(N) is NOT here — it's stripped and handled by parse() directly
];

function requiresJsFallback(query) {
    return JS_FALLBACK_PATTERNS.some(pattern => pattern.test(query));
}

/**
 * Split a query string on top-level AND operators, respecting parentheses.
 * e.g., "a = 1 AND SUBQUERY(b, $x, $x.c = 2).@count > 0 AND d = 3"
 * → ["a = 1", "SUBQUERY(b, $x, $x.c = 2).@count > 0", "d = 3"]
 */
function splitTopLevelAnd(query) {
    const clauses = [];
    let depth = 0;
    let start = 0;
    const upper = query.toUpperCase();

    for (let i = 0; i < query.length; i++) {
        const ch = query[i];
        if (ch === '(' || ch === '[') {
            depth++;
        } else if (ch === ')' || ch === ']') {
            depth--;
        } else if (depth === 0) {
            // Check for top-level AND (word boundary)
            if (upper.substring(i, i + 3) === 'AND' &&
                (i === 0 || /\s/.test(query[i - 1])) &&
                (i + 3 >= query.length || /\s/.test(query[i + 3]))) {
                const clause = query.substring(start, i).trim();
                if (clause.length > 0) {
                    clauses.push(clause);
                }
                start = i + 3;
            }
        }
    }

    // Last clause
    const last = query.substring(start).trim();
    if (last.length > 0) {
        clauses.push(last);
    }

    return clauses;
}

// ──────────────── Public API ────────────────

class RealmQueryParser {
    /**
     * Parse a Realm query string and produce SQL WHERE clause.
     *
     * @param {string} query - Realm query string (e.g., 'voided = false AND uuid = $0')
     * @param {Array} args - Substitution arguments for $0, $1, etc.
     * @param {string} rootSchemaName - The Realm schema name for the root table
     * @param {Map} schemaMap - Map<schemaName, schemaObject> for resolving relationships
     * @returns {{ where: string, params: Array, joins: Array<{table, alias, on}>, unsupported: boolean }}
     */
    static parse(query, args = [], rootSchemaName = null, schemaMap = new Map(), aliasOffset = 0) {
        if (!query || typeof query !== "string") {
            return {where: "1=1", params: [], joins: [], unsupported: false, limit: null};
        }

        let trimmed = query.trim();

        // Strip limit(N) before any processing — it's a result-set modifier,
        // not a filter predicate. Extracted here so the remaining query can be
        // parsed normally (e.g., "hasMigrated = false limit(1)" → parse "hasMigrated = false").
        let limitValue = null;
        const limitMatch = trimmed.match(/\blimit\s*\(\s*(\d+)\s*\)/i);
        if (limitMatch) {
            limitValue = parseInt(limitMatch[1], 10);
            trimmed = trimmed.replace(/\blimit\s*\(\s*\d+\s*\)/i, "").trim();
            // Clean up trailing/leading AND left after stripping
            trimmed = trimmed.replace(/\bAND\s*$/i, "").replace(/^\s*AND\b/i, "").trim();
        }

        if (trimmed.length === 0) {
            return {where: "1=1", params: [], joins: [], unsupported: false, limit: limitValue};
        }

        // Check for patterns that need JS fallback
        if (requiresJsFallback(trimmed)) {
            // Try partial parsing: split on top-level AND, translate supported clauses to SQL,
            // route JS-fallback clauses (SUBQUERY, TRUEPREDICATE, @count, etc.) to
            // JsFallbackFilterEvaluator for post-hydration filtering.
            // e.g. "voided = false AND SUBQUERY(...)" → SQL handles voided, JS handles SUBQUERY.
            const partialResult = this._parsePartial(trimmed, args, rootSchemaName, schemaMap, aliasOffset);
            if (partialResult) {
                partialResult.limit = limitValue;
                return partialResult;
            }
            return {
                where: null,
                params: [],
                joins: [],
                unsupported: true,
                originalQuery: trimmed,
                reason: "Query requires JS fallback (SUBQUERY, TRUEPREDICATE, @links, @count, @size, ANY, etc.)",
                limit: limitValue,
            };
        }

        try {
            const tokens = tokenize(trimmed);
            const parser = new Parser(tokens);
            const ast = parser.parse();

            const generator = new SqlGenerator(schemaMap, rootSchemaName, args);
            generator.aliasCounter = aliasOffset;
            const result = generator.generate(ast);

            return {
                where: result.where,
                params: result.params,
                joins: result.joins,
                unsupported: false,
                limit: limitValue,
            };
        } catch (e) {
            // If parsing fails, flag as unsupported for JS fallback
            return {
                where: null,
                params: [],
                joins: [],
                unsupported: true,
                originalQuery: trimmed,
                reason: `Parse error: ${e.message}`,
                limit: limitValue,
            };
        }
    }

    /**
     * Attempt partial parsing of a query containing JS-fallback patterns.
     * Splits on top-level AND, parses each clause independently, and combines
     * the SQL-translatable ones into a WHERE clause. JS-fallback clauses are
     * collected as skippedClauses and later evaluated by JsFallbackFilterEvaluator.
     *
     * Returns a parse result if at least one clause was successfully parsed,
     * or null if no clauses could be parsed.
     */
    static _parsePartial(query, args, rootSchemaName, schemaMap, aliasOffset) {
        // Split on top-level AND — we need to handle parenthesized SUBQUERY() blocks
        // by tracking paren depth so we don't split inside them.
        const clauses = splitTopLevelAnd(query);
        if (clauses.length <= 1) {
            // Single clause that needs JS fallback — can't do partial parsing
            return null;
        }

        const supportedWhere = [];
        const supportedParams = [];
        const supportedJoins = [];
        const skippedClauses = [];
        let currentAliasOffset = aliasOffset;

        for (const clause of clauses) {
            const trimmedClause = clause.trim();
            if (requiresJsFallback(trimmedClause)) {
                skippedClauses.push(trimmedClause);
                continue;
            }

            try {
                const tokens = tokenize(trimmedClause);
                const parser = new Parser(tokens);
                const ast = parser.parse();

                const generator = new SqlGenerator(schemaMap, rootSchemaName, args);
                generator.aliasCounter = currentAliasOffset;
                const result = generator.generate(ast);

                if (result.where) {
                    supportedWhere.push(result.where);
                    supportedParams.push(...result.params);
                    supportedJoins.push(...result.joins);
                    currentAliasOffset = generator.aliasCounter;
                }
            } catch (e) {
                // This clause failed to parse — route to JS fallback
                skippedClauses.push(trimmedClause);
            }
        }

        if (supportedWhere.length === 0) {
            return null; // No clauses could be parsed
        }

        if (skippedClauses.length > 0) {
            console.warn(
                `RealmQueryParser: Partial parse — ${skippedClauses.length} clause(s) routed to JS fallback:`,
                skippedClauses.map(c => c.substring(0, 80))
            );
        }

        return {
            where: supportedWhere.join(" AND "),
            params: supportedParams,
            joins: supportedJoins,
            unsupported: false,
            partialParse: true,
            skippedClauses,
        };
    }

    /**
     * Build a complete SELECT SQL from a parsed query result.
     *
     * @param {string} tableName - The root table name
     * @param {Object} parseResult - Result from parse()
     * @param {string} orderBy - Optional ORDER BY clause
     * @param {number} limit - Optional LIMIT
     * @param {number} offset - Optional OFFSET
     * @returns {{ sql: string, params: Array }}
     */
    static buildSelect(tableName, parseResult, orderBy = null, limit = null, offset = null) {
        let sql = `SELECT t0.* FROM ${tableName} AS t0`;

        // Add JOINs
        if (parseResult.joins && parseResult.joins.length > 0) {
            for (const join of parseResult.joins) {
                sql += ` LEFT JOIN ${join.table} AS ${join.alias} ON ${join.on}`;
            }
        }

        // Add WHERE
        if (parseResult.where) {
            sql += ` WHERE ${parseResult.where}`;
        }

        // Add ORDER BY
        if (orderBy) {
            sql += ` ORDER BY ${orderBy}`;
        }

        // Add LIMIT / OFFSET
        if (limit != null) {
            sql += ` LIMIT ${limit}`;
        }
        if (offset != null) {
            sql += ` OFFSET ${offset}`;
        }

        return {sql, params: parseResult.params || []};
    }
}

export {RealmQueryParser, UnsupportedRealmQueryError, camelToSnake, schemaNameToTableName, normalizeRealmType};
export default RealmQueryParser;
