import JsFallbackFilterEvaluator from "../../../src/framework/db/JsFallbackFilterEvaluator";

// ──── Fixture helpers ────

function makeEntity(fields) {
    return {...fields};
}

function makeObservation({conceptUuid, valueJSON}) {
    return {concept: {uuid: conceptUuid}, valueJSON};
}

function makeEnrolment({voided = false, programExitDateTime = null, program = null, encounters = []}) {
    return {voided, programExitDateTime, program, encounters};
}

function makeEncounter({voided = false, encounterType = null}) {
    return {voided, encounterType};
}

// ──── Tests ────

describe("JsFallbackFilterEvaluator", () => {

    beforeEach(() => {
        jest.spyOn(console, "warn").mockImplementation(() => {});
    });

    afterEach(() => {
        console.warn.mockRestore();
    });

    // ──── Utility methods ────

    describe("_resolveFieldValue", () => {
        it("should resolve a simple property", () => {
            expect(JsFallbackFilterEvaluator._resolveFieldValue({name: "Alice"}, "name")).toBe("Alice");
        });

        it("should resolve dot-notation path", () => {
            const entity = {concept: {uuid: "c1", name: "Weight"}};
            expect(JsFallbackFilterEvaluator._resolveFieldValue(entity, "concept.uuid")).toBe("c1");
        });

        it("should resolve deep dot-notation", () => {
            const entity = {a: {b: {c: 42}}};
            expect(JsFallbackFilterEvaluator._resolveFieldValue(entity, "a.b.c")).toBe(42);
        });

        it("should return undefined for null in chain", () => {
            const entity = {concept: null};
            expect(JsFallbackFilterEvaluator._resolveFieldValue(entity, "concept.uuid")).toBeUndefined();
        });

        it("should return undefined for undefined entity", () => {
            expect(JsFallbackFilterEvaluator._resolveFieldValue(undefined, "name")).toBeUndefined();
        });

        it("should return undefined for missing property", () => {
            expect(JsFallbackFilterEvaluator._resolveFieldValue({a: 1}, "b")).toBeUndefined();
        });
    });

    describe("_resolveConditionValue", () => {
        it("should parse double-quoted string", () => {
            expect(JsFallbackFilterEvaluator._resolveConditionValue('"hello"', [])).toBe("hello");
        });

        it("should parse single-quoted string", () => {
            expect(JsFallbackFilterEvaluator._resolveConditionValue("'world'", [])).toBe("world");
        });

        it("should resolve $0 parameter", () => {
            expect(JsFallbackFilterEvaluator._resolveConditionValue("$0", ["val"])).toBe("val");
        });

        it("should resolve $1 parameter", () => {
            expect(JsFallbackFilterEvaluator._resolveConditionValue("$1", ["a", "b"])).toBe("b");
        });

        it("should parse true", () => {
            expect(JsFallbackFilterEvaluator._resolveConditionValue("true", [])).toBe(true);
        });

        it("should parse false", () => {
            expect(JsFallbackFilterEvaluator._resolveConditionValue("false", [])).toBe(false);
        });

        it("should parse null", () => {
            expect(JsFallbackFilterEvaluator._resolveConditionValue("null", [])).toBeNull();
        });

        it("should parse nil as null", () => {
            expect(JsFallbackFilterEvaluator._resolveConditionValue("nil", [])).toBeNull();
        });

        it("should parse integer", () => {
            expect(JsFallbackFilterEvaluator._resolveConditionValue("42", [])).toBe(42);
        });

        it("should parse float", () => {
            expect(JsFallbackFilterEvaluator._resolveConditionValue("3.14", [])).toBe(3.14);
        });
    });

    describe("_compareCount", () => {
        it("should handle = operator", () => {
            expect(JsFallbackFilterEvaluator._compareCount(0, "=", 0)).toBe(true);
            expect(JsFallbackFilterEvaluator._compareCount(1, "=", 0)).toBe(false);
        });

        it("should handle == as =", () => {
            expect(JsFallbackFilterEvaluator._compareCount(3, "==", 3)).toBe(true);
        });

        it("should handle != operator", () => {
            expect(JsFallbackFilterEvaluator._compareCount(1, "!=", 0)).toBe(true);
            expect(JsFallbackFilterEvaluator._compareCount(0, "!=", 0)).toBe(false);
        });

        it("should handle <> as !=", () => {
            expect(JsFallbackFilterEvaluator._compareCount(1, "<>", 0)).toBe(true);
        });

        it("should handle > operator", () => {
            expect(JsFallbackFilterEvaluator._compareCount(1, ">", 0)).toBe(true);
            expect(JsFallbackFilterEvaluator._compareCount(0, ">", 0)).toBe(false);
        });

        it("should handle < operator", () => {
            expect(JsFallbackFilterEvaluator._compareCount(0, "<", 1)).toBe(true);
            expect(JsFallbackFilterEvaluator._compareCount(1, "<", 1)).toBe(false);
        });

        it("should handle >= and <= operators", () => {
            expect(JsFallbackFilterEvaluator._compareCount(2, ">=", 2)).toBe(true);
            expect(JsFallbackFilterEvaluator._compareCount(2, "<=", 2)).toBe(true);
            expect(JsFallbackFilterEvaluator._compareCount(1, ">=", 2)).toBe(false);
            expect(JsFallbackFilterEvaluator._compareCount(3, "<=", 2)).toBe(false);
        });
    });

    describe("_compare", () => {
        it("should compare equal strings", () => {
            expect(JsFallbackFilterEvaluator._compare("abc", "=", "abc")).toBe(true);
            expect(JsFallbackFilterEvaluator._compare("abc", "=", "def")).toBe(false);
        });

        it("should compare null values", () => {
            expect(JsFallbackFilterEvaluator._compare(null, "=", null)).toBe(true);
            expect(JsFallbackFilterEvaluator._compare(null, "!=", null)).toBe(false);
            expect(JsFallbackFilterEvaluator._compare("abc", "!=", null)).toBe(true);
            expect(JsFallbackFilterEvaluator._compare(null, "=", "abc")).toBe(false);
        });

        it("should compare booleans with 0/1 coercion", () => {
            expect(JsFallbackFilterEvaluator._compare(false, "=", false)).toBe(true);
            expect(JsFallbackFilterEvaluator._compare(0, "=", false)).toBe(true);
            expect(JsFallbackFilterEvaluator._compare(1, "=", true)).toBe(true);
            expect(JsFallbackFilterEvaluator._compare(0, "!=", true)).toBe(true);
        });

        it("should compare numbers", () => {
            expect(JsFallbackFilterEvaluator._compare(5, ">", 3)).toBe(true);
            expect(JsFallbackFilterEvaluator._compare(3, "<", 5)).toBe(true);
        });

        it("should handle == as =", () => {
            expect(JsFallbackFilterEvaluator._compare("x", "==", "x")).toBe(true);
        });
    });

    describe("_parseSubquery", () => {
        it("should parse standard SUBQUERY", () => {
            const result = JsFallbackFilterEvaluator._parseSubquery(
                'SUBQUERY(observations, $observation, $observation.concept.uuid = "c1").@count > 0'
            );
            expect(result).not.toBeNull();
            expect(result.listProp).toBe("observations");
            expect(result.varName).toBe("$observation");
            expect(result.conditions).toBe('$observation.concept.uuid = "c1"');
            expect(result.operator).toBe(">");
            expect(result.count).toBe(0);
        });

        it("should parse SUBQUERY with nested parens in conditions", () => {
            const result = JsFallbackFilterEvaluator._parseSubquery(
                'SUBQUERY(observations, $obs, ($obs.valueJSON contains \'"value":42\' OR $obs.valueJSON contains \'"value":"42"\')).@count > 0'
            );
            expect(result).not.toBeNull();
            expect(result.listProp).toBe("observations");
            expect(result.conditions).toContain("OR");
            expect(result.operator).toBe(">");
            expect(result.count).toBe(0);
        });

        it("should parse SUBQUERY with == operator", () => {
            const result = JsFallbackFilterEvaluator._parseSubquery(
                "SUBQUERY(items, $item, $item.active = true).@count == 0"
            );
            expect(result).not.toBeNull();
            expect(result.operator).toBe("==");
            expect(result.count).toBe(0);
        });

        it("should return null for malformed SUBQUERY", () => {
            expect(JsFallbackFilterEvaluator._parseSubquery("not a subquery")).toBeNull();
        });
    });

    describe("_splitTopLevel", () => {
        it("should split on AND", () => {
            const parts = JsFallbackFilterEvaluator._splitTopLevel("a = 1 AND b = 2", "AND");
            expect(parts).toEqual(["a = 1", "b = 2"]);
        });

        it("should split on OR", () => {
            const parts = JsFallbackFilterEvaluator._splitTopLevel("a = 1 OR b = 2", "OR");
            expect(parts).toEqual(["a = 1", "b = 2"]);
        });

        it("should not split inside parentheses", () => {
            const parts = JsFallbackFilterEvaluator._splitTopLevel("(a = 1 AND b = 2) AND c = 3", "AND");
            expect(parts).toEqual(["(a = 1 AND b = 2)", "c = 3"]);
        });

        it("should not split inside quoted strings", () => {
            const parts = JsFallbackFilterEvaluator._splitTopLevel('x contains "a AND b" AND y = 1', "AND");
            expect(parts).toEqual(['x contains "a AND b"', "y = 1"]);
        });

        it("should return single element for no split", () => {
            const parts = JsFallbackFilterEvaluator._splitTopLevel("a = 1", "AND");
            expect(parts).toEqual(["a = 1"]);
        });
    });

    describe("_stripParens", () => {
        it("should strip matching outer parens", () => {
            expect(JsFallbackFilterEvaluator._stripParens("(a = 1)")).toBe("a = 1");
        });

        it("should not strip non-wrapping parens", () => {
            expect(JsFallbackFilterEvaluator._stripParens("(a) AND (b)")).toBe("(a) AND (b)");
        });

        it("should not strip if no parens", () => {
            expect(JsFallbackFilterEvaluator._stripParens("a = 1")).toBe("a = 1");
        });
    });

    // ──── Pattern A: TRUEPREDICATE DISTINCT ────

    describe("Pattern A: TRUEPREDICATE DISTINCT(field)", () => {
        it("should deduplicate by simple field (typeUuid)", () => {
            const entities = [
                makeEntity({uuid: "1", typeUuid: "t1"}),
                makeEntity({uuid: "2", typeUuid: "t2"}),
                makeEntity({uuid: "3", typeUuid: "t1"}),
                makeEntity({uuid: "4", typeUuid: "t3"}),
                makeEntity({uuid: "5", typeUuid: "t2"}),
            ];
            const result = JsFallbackFilterEvaluator.apply(
                entities,
                [{query: "TRUEPREDICATE DISTINCT(typeUuid)", args: []}],
                "AddressLevel"
            );
            expect(result).toHaveLength(3);
            expect(result.map(e => e.uuid)).toEqual(["1", "2", "4"]);
        });

        it("should deduplicate by entityName field", () => {
            const entities = [
                makeEntity({uuid: "1", entityName: "Individual"}),
                makeEntity({uuid: "2", entityName: "Encounter"}),
                makeEntity({uuid: "3", entityName: "Individual"}),
                makeEntity({uuid: "4", entityName: "Encounter"}),
            ];
            const result = JsFallbackFilterEvaluator.apply(
                entities,
                [{query: "TRUEPREDICATE DISTINCT(entityName)", args: []}],
                "EntitySyncStatus"
            );
            expect(result).toHaveLength(2);
            expect(result.map(e => e.entityName)).toEqual(["Individual", "Encounter"]);
        });

        it("should deduplicate by entity field (EntityQueue)", () => {
            const entities = [
                makeEntity({entity: "Individual", entityUUID: "a"}),
                makeEntity({entity: "Encounter", entityUUID: "b"}),
                makeEntity({entity: "Individual", entityUUID: "c"}),
            ];
            const result = JsFallbackFilterEvaluator.apply(
                entities,
                [{query: "TRUEPREDICATE DISTINCT(entity)", args: []}],
                "EntityQueue"
            );
            expect(result).toHaveLength(2);
            expect(result.map(e => e.entity)).toEqual(["Individual", "Encounter"]);
        });

        it("should deduplicate by dot-notation field (groupSubject.uuid)", () => {
            const entities = [
                makeEntity({uuid: "1", groupSubject: {uuid: "g1"}}),
                makeEntity({uuid: "2", groupSubject: {uuid: "g2"}}),
                makeEntity({uuid: "3", groupSubject: {uuid: "g1"}}),
            ];
            const result = JsFallbackFilterEvaluator.apply(
                entities,
                [{query: "TRUEPREDICATE DISTINCT(groupSubject.uuid)", args: []}],
                "GroupSubject"
            );
            expect(result).toHaveLength(2);
            expect(result.map(e => e.uuid)).toEqual(["1", "2"]);
        });

        it("should deduplicate by dot-notation field (dashboard.uuid)", () => {
            const entities = [
                makeEntity({uuid: "1", dashboard: {uuid: "d1"}}),
                makeEntity({uuid: "2", dashboard: {uuid: "d1"}}),
                makeEntity({uuid: "3", dashboard: {uuid: "d2"}}),
            ];
            const result = JsFallbackFilterEvaluator.apply(
                entities,
                [{query: "TRUEPREDICATE DISTINCT(dashboard.uuid)", args: []}],
                "GroupDashboard"
            );
            expect(result).toHaveLength(2);
            expect(result.map(e => e.uuid)).toEqual(["1", "3"]);
        });

        it("should group null/undefined field values as one", () => {
            const entities = [
                makeEntity({uuid: "1", typeUuid: null}),
                makeEntity({uuid: "2", typeUuid: "t1"}),
                makeEntity({uuid: "3", typeUuid: undefined}),
            ];
            const result = JsFallbackFilterEvaluator.apply(
                entities,
                [{query: "TRUEPREDICATE DISTINCT(typeUuid)", args: []}],
                "AddressLevel"
            );
            expect(result).toHaveLength(2);
            expect(result.map(e => e.uuid)).toEqual(["1", "2"]);
        });

        it("should preserve first-occurrence order", () => {
            const entities = [
                makeEntity({uuid: "1", level: 3}),
                makeEntity({uuid: "2", level: 1}),
                makeEntity({uuid: "3", level: 3}),
                makeEntity({uuid: "4", level: 2}),
                makeEntity({uuid: "5", level: 1}),
            ];
            const result = JsFallbackFilterEvaluator.apply(
                entities,
                [{query: "TRUEPREDICATE DISTINCT(level)", args: []}],
                "AddressLevel"
            );
            expect(result.map(e => e.uuid)).toEqual(["1", "2", "4"]);
        });

        it("should handle empty array", () => {
            const result = JsFallbackFilterEvaluator.apply(
                [],
                [{query: "TRUEPREDICATE DISTINCT(typeUuid)", args: []}],
                "AddressLevel"
            );
            expect(result).toEqual([]);
        });

        it("should handle single entity", () => {
            const entities = [makeEntity({uuid: "1", typeUuid: "t1"})];
            const result = JsFallbackFilterEvaluator.apply(
                entities,
                [{query: "TRUEPREDICATE DISTINCT(typeUuid)", args: []}],
                "AddressLevel"
            );
            expect(result).toHaveLength(1);
        });

        it("should handle DISTINCT with SORT(field ASC)", () => {
            // Entities with same typeUuid but different levels
            // SORT ASC: pick the entity with lowest level per typeUuid group
            const entities = [
                makeEntity({uuid: "1", typeUuid: "t1", level: 5}),
                makeEntity({uuid: "2", typeUuid: "t2", level: 2}),
                makeEntity({uuid: "3", typeUuid: "t1", level: 3}),
                makeEntity({uuid: "4", typeUuid: "t2", level: 8}),
            ];
            const result = JsFallbackFilterEvaluator.apply(
                entities,
                [{query: "TRUEPREDICATE DISTINCT(typeUuid) SORT(level ASC)", args: []}],
                "AddressLevel"
            );
            expect(result).toHaveLength(2);
            // t1 winner is uuid=3 (level 3, lowest), t2 winner is uuid=2 (level 2)
            // Original order: entities that are winners
            const uuids = result.map(e => e.uuid);
            expect(uuids).toContain("2");
            expect(uuids).toContain("3");
        });

        it("should handle DISTINCT with SORT(field DESC)", () => {
            const entities = [
                makeEntity({uuid: "1", typeUuid: "t1", level: 5}),
                makeEntity({uuid: "2", typeUuid: "t2", level: 2}),
                makeEntity({uuid: "3", typeUuid: "t1", level: 3}),
                makeEntity({uuid: "4", typeUuid: "t2", level: 8}),
            ];
            const result = JsFallbackFilterEvaluator.apply(
                entities,
                [{query: "TRUEPREDICATE DISTINCT(typeUuid) SORT(level DESC)", args: []}],
                "AddressLevel"
            );
            expect(result).toHaveLength(2);
            // t1 winner is uuid=1 (level 5, highest), t2 winner is uuid=4 (level 8)
            const uuids = result.map(e => e.uuid);
            expect(uuids).toContain("1");
            expect(uuids).toContain("4");
        });
    });

    // ──── Pattern C: listProp.@count ────

    describe("Pattern C: listProp.@count OP N", () => {
        it("should filter by locationMappings.@count == 0", () => {
            const entities = [
                makeEntity({uuid: "1", locationMappings: []}),
                makeEntity({uuid: "2", locationMappings: [{id: 1}]}),
                makeEntity({uuid: "3", locationMappings: []}),
            ];
            const result = JsFallbackFilterEvaluator.apply(
                entities,
                [{query: "locationMappings.@count == 0", args: []}],
                "AddressLevel"
            );
            expect(result).toHaveLength(2);
            expect(result.map(e => e.uuid)).toEqual(["1", "3"]);
        });

        it("should filter by @count > 0", () => {
            const entities = [
                makeEntity({uuid: "1", items: []}),
                makeEntity({uuid: "2", items: [{id: 1}]}),
                makeEntity({uuid: "3", items: [{id: 2}, {id: 3}]}),
            ];
            const result = JsFallbackFilterEvaluator.apply(
                entities,
                [{query: "items.@count > 0", args: []}],
                "TestSchema"
            );
            expect(result).toHaveLength(2);
            expect(result.map(e => e.uuid)).toEqual(["2", "3"]);
        });

        it("should treat undefined/null list as length 0", () => {
            const entities = [
                makeEntity({uuid: "1", locationMappings: undefined}),
                makeEntity({uuid: "2", locationMappings: null}),
                makeEntity({uuid: "3", locationMappings: [{id: 1}]}),
            ];
            const result = JsFallbackFilterEvaluator.apply(
                entities,
                [{query: "locationMappings.@count == 0", args: []}],
                "AddressLevel"
            );
            expect(result).toHaveLength(2);
            expect(result.map(e => e.uuid)).toEqual(["1", "2"]);
        });

        it("should filter by @count >= 2", () => {
            const entities = [
                makeEntity({uuid: "1", items: []}),
                makeEntity({uuid: "2", items: [{id: 1}]}),
                makeEntity({uuid: "3", items: [{id: 2}, {id: 3}]}),
                makeEntity({uuid: "4", items: [{id: 4}, {id: 5}, {id: 6}]}),
            ];
            const result = JsFallbackFilterEvaluator.apply(
                entities,
                [{query: "items.@count >= 2", args: []}],
                "TestSchema"
            );
            expect(result).toHaveLength(2);
            expect(result.map(e => e.uuid)).toEqual(["3", "4"]);
        });
    });

    // ──── listProp.@size (alias for @count) ────

    describe("listProp.@size OP N", () => {
        it("should filter by media.@size > 0", () => {
            const entities = [
                makeEntity({uuid: "1", media: [{url: "http://a.com/1.jpg"}]}),
                makeEntity({uuid: "2", media: []}),
                makeEntity({uuid: "3", media: [{url: "http://a.com/2.jpg"}, {url: "http://a.com/3.jpg"}]}),
            ];
            const result = JsFallbackFilterEvaluator.apply(
                entities,
                [{query: "media.@size > 0", args: []}],
                "Concept"
            );
            expect(result).toHaveLength(2);
            expect(result.map(e => e.uuid)).toEqual(["1", "3"]);
        });

        it("should filter by media.@size == 0", () => {
            const entities = [
                makeEntity({uuid: "1", media: [{url: "http://a.com/1.jpg"}]}),
                makeEntity({uuid: "2", media: []}),
            ];
            const result = JsFallbackFilterEvaluator.apply(
                entities,
                [{query: "media.@size == 0", args: []}],
                "Concept"
            );
            expect(result).toHaveLength(1);
            expect(result[0].uuid).toBe("2");
        });

        it("should treat undefined/null list as size 0", () => {
            const entities = [
                makeEntity({uuid: "1", media: undefined}),
                makeEntity({uuid: "2", media: null}),
                makeEntity({uuid: "3", media: [{url: "http://a.com/1.jpg"}]}),
            ];
            const result = JsFallbackFilterEvaluator.apply(
                entities,
                [{query: "media.@size == 0", args: []}],
                "Concept"
            );
            expect(result).toHaveLength(2);
            expect(result.map(e => e.uuid)).toEqual(["1", "2"]);
        });
    });

    // ──── ANY quantifier ────

    describe("ANY listProp.field OP value", () => {
        it("should filter by ANY media.url CONTAINS[c] $0 — matching URL found", () => {
            const entities = [
                makeEntity({uuid: "1", media: [{url: "http://example.com/photo.jpg"}, {url: "http://other.com/vid.mp4"}]}),
                makeEntity({uuid: "2", media: [{url: "http://example.com/doc.pdf"}]}),
                makeEntity({uuid: "3", media: [{url: "http://elsewhere.com/file.txt"}]}),
            ];
            const result = JsFallbackFilterEvaluator.apply(
                entities,
                [{query: "ANY media.url CONTAINS[c] $0", args: ["photo"]}],
                "PruneMedia"
            );
            expect(result).toHaveLength(1);
            expect(result[0].uuid).toBe("1");
        });

        it("should filter by ANY media.url CONTAINS[c] $0 — no matching URL", () => {
            const entities = [
                makeEntity({uuid: "1", media: [{url: "http://example.com/photo.jpg"}]}),
                makeEntity({uuid: "2", media: [{url: "http://example.com/doc.pdf"}]}),
            ];
            const result = JsFallbackFilterEvaluator.apply(
                entities,
                [{query: "ANY media.url CONTAINS[c] $0", args: ["nonexistent"]}],
                "PruneMedia"
            );
            expect(result).toHaveLength(0);
        });

        it("should return no matches for empty/missing list", () => {
            const entities = [
                makeEntity({uuid: "1", media: []}),
                makeEntity({uuid: "2", media: undefined}),
                makeEntity({uuid: "3"}),
            ];
            const result = JsFallbackFilterEvaluator.apply(
                entities,
                [{query: "ANY media.url CONTAINS[c] $0", args: ["test"]}],
                "PruneMedia"
            );
            expect(result).toHaveLength(0);
        });

        it("should be case-insensitive with [c] modifier", () => {
            const entities = [
                makeEntity({uuid: "1", media: [{url: "HTTP://EXAMPLE.COM/PHOTO.JPG"}]}),
            ];
            const result = JsFallbackFilterEvaluator.apply(
                entities,
                [{query: "ANY media.url CONTAINS[c] $0", args: ["photo"]}],
                "PruneMedia"
            );
            expect(result).toHaveLength(1);
            expect(result[0].uuid).toBe("1");
        });

        it("should filter by ANY with equality comparison", () => {
            const entities = [
                makeEntity({uuid: "1", tags: [{name: "urgent"}, {name: "review"}]}),
                makeEntity({uuid: "2", tags: [{name: "done"}]}),
            ];
            const result = JsFallbackFilterEvaluator.apply(
                entities,
                [{query: 'ANY tags.name = "urgent"', args: []}],
                "Task"
            );
            expect(result).toHaveLength(1);
            expect(result[0].uuid).toBe("1");
        });

        it("should filter by ANY with BEGINSWITH", () => {
            const entities = [
                makeEntity({uuid: "1", media: [{url: "http://s3.amazonaws.com/bucket/photo.jpg"}]}),
                makeEntity({uuid: "2", media: [{url: "http://other.com/photo.jpg"}]}),
            ];
            const result = JsFallbackFilterEvaluator.apply(
                entities,
                [{query: 'ANY media.url BEGINSWITH "http://s3"', args: []}],
                "PruneMedia"
            );
            expect(result).toHaveLength(1);
            expect(result[0].uuid).toBe("1");
        });
    });

    // ──── limit(N) ────

    describe("limit(N)", () => {
        it("should limit results to 1", () => {
            const entities = [
                makeEntity({uuid: "1"}),
                makeEntity({uuid: "2"}),
                makeEntity({uuid: "3"}),
            ];
            const result = JsFallbackFilterEvaluator.apply(
                entities,
                [{query: "limit(1)", args: []}],
                "SubjectMigration"
            );
            expect(result).toHaveLength(1);
            expect(result[0].uuid).toBe("1");
        });

        it("should limit results to 2", () => {
            const entities = [
                makeEntity({uuid: "1"}),
                makeEntity({uuid: "2"}),
                makeEntity({uuid: "3"}),
            ];
            const result = JsFallbackFilterEvaluator.apply(
                entities,
                [{query: "limit(2)", args: []}],
                "SubjectMigration"
            );
            expect(result).toHaveLength(2);
            expect(result.map(e => e.uuid)).toEqual(["1", "2"]);
        });

        it("should handle limit greater than entity count", () => {
            const entities = [
                makeEntity({uuid: "1"}),
            ];
            const result = JsFallbackFilterEvaluator.apply(
                entities,
                [{query: "limit(5)", args: []}],
                "SubjectMigration"
            );
            expect(result).toHaveLength(1);
        });
    });

    // ──── @links.@count ────

    describe("Pattern D: @links.@count", () => {
        it("should return empty array for @links.@count", () => {
            const entities = [
                makeEntity({uuid: "1"}),
                makeEntity({uuid: "2"}),
            ];
            const result = JsFallbackFilterEvaluator.apply(
                entities,
                [{query: "@links.@count == 0", args: []}],
                "Individual"
            );
            expect(result).toEqual([]);
        });

        it("should log console.warn with schema name", () => {
            JsFallbackFilterEvaluator.apply(
                [makeEntity({uuid: "1"})],
                [{query: "@links.@count == 0", args: []}],
                "Individual"
            );
            expect(console.warn).toHaveBeenCalledWith(
                expect.stringContaining("@links.@count not evaluable")
            );
        });
    });

    // ──── Pattern B: SUBQUERY(...).@count ────

    describe("Pattern B: SUBQUERY(...).@count OP N", () => {
        it("should filter by observation concept.uuid match", () => {
            const entities = [
                makeEntity({
                    uuid: "1",
                    observations: [
                        makeObservation({conceptUuid: "c1", valueJSON: '{"value":"hello"}'}),
                    ],
                }),
                makeEntity({
                    uuid: "2",
                    observations: [
                        makeObservation({conceptUuid: "c2", valueJSON: '{"value":"world"}'}),
                    ],
                }),
                makeEntity({
                    uuid: "3",
                    observations: [],
                }),
            ];
            const result = JsFallbackFilterEvaluator.apply(
                entities,
                [{
                    query: 'SUBQUERY(observations, $observation, $observation.concept.uuid = "c1").@count > 0',
                    args: [],
                }],
                "Individual"
            );
            expect(result).toHaveLength(1);
            expect(result[0].uuid).toBe("1");
        });

        it("should filter by concept.uuid AND valueJSON CONTAINS (phone number pattern)", () => {
            const entities = [
                makeEntity({
                    uuid: "1",
                    observations: [
                        makeObservation({conceptUuid: "c1", valueJSON: '{"phoneNumber":"1234567890"}'}),
                    ],
                }),
                makeEntity({
                    uuid: "2",
                    observations: [
                        makeObservation({conceptUuid: "c1", valueJSON: '{"phoneNumber":"9999999999"}'}),
                    ],
                }),
            ];
            const result = JsFallbackFilterEvaluator.apply(
                entities,
                [{
                    query: `SUBQUERY(observations, $observation, $observation.concept.uuid = "c1" and $observation.valueJSON contains '"phoneNumber":"1234567890"').@count > 0`,
                    args: [],
                }],
                "Individual"
            );
            expect(result).toHaveLength(1);
            expect(result[0].uuid).toBe("1");
        });

        it("should filter by valueJSON CONTAINS with OR conditions (numeric pattern)", () => {
            const entities = [
                makeEntity({
                    uuid: "1",
                    observations: [
                        makeObservation({conceptUuid: "c1", valueJSON: '{"value":42}'}),
                    ],
                }),
                makeEntity({
                    uuid: "2",
                    observations: [
                        makeObservation({conceptUuid: "c1", valueJSON: '{"value":"42"}'}),
                    ],
                }),
                makeEntity({
                    uuid: "3",
                    observations: [
                        makeObservation({conceptUuid: "c1", valueJSON: '{"value":"other"}'}),
                    ],
                }),
            ];
            const result = JsFallbackFilterEvaluator.apply(
                entities,
                [{
                    query: `SUBQUERY(observations, $observation, $observation.concept.uuid = "c1" and ($observation.valueJSON contains '"value":42' OR $observation.valueJSON contains '"value":"42"')).@count > 0`,
                    args: [],
                }],
                "Individual"
            );
            expect(result).toHaveLength(2);
            expect(result.map(e => e.uuid)).toEqual(["1", "2"]);
        });

        it("should filter by enrolment conditions (voided, programExitDateTime, program.uuid)", () => {
            const entities = [
                makeEntity({
                    uuid: "1",
                    enrolments: [
                        makeEnrolment({voided: false, programExitDateTime: null, program: {uuid: "p1"}}),
                    ],
                }),
                makeEntity({
                    uuid: "2",
                    enrolments: [
                        makeEnrolment({voided: true, programExitDateTime: null, program: {uuid: "p1"}}),
                    ],
                }),
                makeEntity({
                    uuid: "3",
                    enrolments: [
                        makeEnrolment({voided: false, programExitDateTime: "2024-01-01", program: {uuid: "p1"}}),
                    ],
                }),
            ];
            const result = JsFallbackFilterEvaluator.apply(
                entities,
                [{
                    query: 'SUBQUERY(enrolments, $enrolment, $enrolment.voided = false and $enrolment.programExitDateTime = null and $enrolment.program.uuid = "p1").@count > 0',
                    args: [],
                }],
                "Individual"
            );
            expect(result).toHaveLength(1);
            expect(result[0].uuid).toBe("1");
        });

        it("should filter by encounter conditions", () => {
            const entities = [
                makeEntity({
                    uuid: "1",
                    encounters: [
                        makeEncounter({voided: false, encounterType: {uuid: "et1"}}),
                    ],
                }),
                makeEntity({
                    uuid: "2",
                    encounters: [
                        makeEncounter({voided: true, encounterType: {uuid: "et1"}}),
                    ],
                }),
                makeEntity({
                    uuid: "3",
                    encounters: [
                        makeEncounter({voided: false, encounterType: {uuid: "et2"}}),
                    ],
                }),
            ];
            const result = JsFallbackFilterEvaluator.apply(
                entities,
                [{
                    query: 'SUBQUERY(encounters, $encounter, $encounter.voided = false and $encounter.encounterType.uuid = "et1").@count > 0',
                    args: [],
                }],
                "Individual"
            );
            expect(result).toHaveLength(1);
            expect(result[0].uuid).toBe("1");
        });

        it("should handle @count == 0 (inverse — no matching items)", () => {
            const entities = [
                makeEntity({uuid: "1", observations: [makeObservation({conceptUuid: "c1", valueJSON: ""})]}),
                makeEntity({uuid: "2", observations: []}),
            ];
            const result = JsFallbackFilterEvaluator.apply(
                entities,
                [{
                    query: 'SUBQUERY(observations, $observation, $observation.concept.uuid = "c1").@count == 0',
                    args: [],
                }],
                "Individual"
            );
            expect(result).toHaveLength(1);
            expect(result[0].uuid).toBe("2");
        });

        it("should handle @count > 1 (threshold)", () => {
            const entities = [
                makeEntity({
                    uuid: "1",
                    observations: [
                        makeObservation({conceptUuid: "c1", valueJSON: ""}),
                        makeObservation({conceptUuid: "c1", valueJSON: ""}),
                    ],
                }),
                makeEntity({
                    uuid: "2",
                    observations: [
                        makeObservation({conceptUuid: "c1", valueJSON: ""}),
                    ],
                }),
            ];
            const result = JsFallbackFilterEvaluator.apply(
                entities,
                [{
                    query: 'SUBQUERY(observations, $observation, $observation.concept.uuid = "c1").@count > 1',
                    args: [],
                }],
                "Individual"
            );
            expect(result).toHaveLength(1);
            expect(result[0].uuid).toBe("1");
        });

        it("should treat missing/undefined list as count 0", () => {
            const entities = [
                makeEntity({uuid: "1"}),  // no observations property
                makeEntity({uuid: "2", observations: null}),
            ];
            const result = JsFallbackFilterEvaluator.apply(
                entities,
                [{
                    query: 'SUBQUERY(observations, $observation, $observation.concept.uuid = "c1").@count > 0',
                    args: [],
                }],
                "Individual"
            );
            expect(result).toHaveLength(0);
        });

        it("should handle nested SUBQUERY permissively", () => {
            // Nested SUBQUERY: outer conditions (voided=false) should still be enforced,
            // but the inner SUBQUERY condition is skipped (permissive)
            const entities = [
                makeEntity({
                    uuid: "1",
                    enrolments: [
                        makeEnrolment({
                            voided: false,
                            encounters: [makeEncounter({voided: false, encounterType: {uuid: "et1"}})],
                        }),
                    ],
                }),
                makeEntity({
                    uuid: "2",
                    enrolments: [
                        makeEnrolment({
                            voided: true, // fails non-SUBQUERY condition
                            encounters: [makeEncounter({voided: false})],
                        }),
                    ],
                }),
            ];
            const result = JsFallbackFilterEvaluator.apply(
                entities,
                [{
                    query: 'SUBQUERY(enrolments, $enrolment, $enrolment.voided = false and (SUBQUERY($enrolment.encounters, $encounter, $encounter.voided = false).@count > 0)).@count > 0',
                    args: [],
                }],
                "Individual"
            );
            // uuid=1: enrolment.voided=false passes, nested SUBQUERY permissive → passes
            // uuid=2: enrolment.voided=true fails → excluded
            expect(result).toHaveLength(1);
            expect(result[0].uuid).toBe("1");
        });

        it("should handle $N parameter substitution in conditions", () => {
            const entities = [
                makeEntity({
                    uuid: "1",
                    encounters: [makeEncounter({voided: false, encounterType: {uuid: "et1"}})],
                }),
                makeEntity({
                    uuid: "2",
                    encounters: [makeEncounter({voided: false, encounterType: {uuid: "et2"}})],
                }),
            ];
            const result = JsFallbackFilterEvaluator.apply(
                entities,
                [{
                    query: "SUBQUERY(encounters, $encounter, $encounter.encounterType.uuid = $0).@count > 0",
                    args: ["et1"],
                }],
                "Individual"
            );
            expect(result).toHaveLength(1);
            expect(result[0].uuid).toBe("1");
        });
    });

    // ──── Condition evaluation ────

    describe("_evaluateConditionString", () => {
        it("should evaluate AND with both conditions true", () => {
            const item = {voided: false, name: "Alice"};
            expect(JsFallbackFilterEvaluator._evaluateConditionString(
                item, '$x.voided = false and $x.name = "Alice"', "$x", []
            )).toBe(true);
        });

        it("should evaluate AND with one condition false", () => {
            const item = {voided: true, name: "Alice"};
            expect(JsFallbackFilterEvaluator._evaluateConditionString(
                item, '$x.voided = false and $x.name = "Alice"', "$x", []
            )).toBe(false);
        });

        it("should evaluate OR with one condition true", () => {
            const item = {status: "B"};
            expect(JsFallbackFilterEvaluator._evaluateConditionString(
                item, '$x.status = "A" OR $x.status = "B"', "$x", []
            )).toBe(true);
        });

        it("should evaluate OR with all conditions false", () => {
            const item = {status: "C"};
            expect(JsFallbackFilterEvaluator._evaluateConditionString(
                item, '$x.status = "A" OR $x.status = "B"', "$x", []
            )).toBe(false);
        });

        it("should handle parenthesized grouping", () => {
            const item = {a: 1, b: 2, c: 3};
            // (a=1 OR b=99) AND c=3 → (true OR false) AND true → true
            expect(JsFallbackFilterEvaluator._evaluateConditionString(
                item, "($x.a = 1 OR $x.b = 99) AND $x.c = 3", "$x", []
            )).toBe(true);
            // (a=99 OR b=99) AND c=3 → (false OR false) AND true → false
            expect(JsFallbackFilterEvaluator._evaluateConditionString(
                item, "($x.a = 99 OR $x.b = 99) AND $x.c = 3", "$x", []
            )).toBe(false);
        });

        it("should handle nested SUBQUERY in conditions permissively", () => {
            const item = {voided: false, encounters: [{voided: false}]};
            // Only the non-SUBQUERY condition should be evaluated
            const result = JsFallbackFilterEvaluator._evaluateConditionString(
                item,
                "$x.voided = false and (SUBQUERY($x.encounters, $e, $e.voided = false).@count > 0)",
                "$x",
                []
            );
            expect(result).toBe(true);
        });

        it("should fail when non-SUBQUERY condition fails even with nested SUBQUERY", () => {
            const item = {voided: true, encounters: [{voided: false}]};
            const result = JsFallbackFilterEvaluator._evaluateConditionString(
                item,
                "$x.voided = false and (SUBQUERY($x.encounters, $e, $e.voided = false).@count > 0)",
                "$x",
                []
            );
            expect(result).toBe(false);
        });
    });

    describe("_evaluateAtomicCondition", () => {
        it("should evaluate CONTAINS string op", () => {
            const item = {valueJSON: '{"phoneNumber":"1234567890"}'};
            expect(JsFallbackFilterEvaluator._evaluateAtomicCondition(
                item, '$obs.valueJSON contains \'"phoneNumber":"1234567890"\'', "$obs", []
            )).toBe(true);
        });

        it("should evaluate BEGINSWITH", () => {
            const item = {name: "Alice"};
            expect(JsFallbackFilterEvaluator._evaluateAtomicCondition(
                item, '$x.name BEGINSWITH "Ali"', "$x", []
            )).toBe(true);
            expect(JsFallbackFilterEvaluator._evaluateAtomicCondition(
                item, '$x.name BEGINSWITH "Bob"', "$x", []
            )).toBe(false);
        });

        it("should evaluate ENDSWITH", () => {
            const item = {name: "Alice"};
            expect(JsFallbackFilterEvaluator._evaluateAtomicCondition(
                item, '$x.name ENDSWITH "ice"', "$x", []
            )).toBe(true);
        });

        it("should evaluate equality with null", () => {
            const item = {programExitDateTime: null};
            expect(JsFallbackFilterEvaluator._evaluateAtomicCondition(
                item, "$e.programExitDateTime = null", "$e", []
            )).toBe(true);
        });

        it("should evaluate inequality with null", () => {
            const item = {programExitDateTime: "2024-01-01"};
            expect(JsFallbackFilterEvaluator._evaluateAtomicCondition(
                item, "$e.programExitDateTime != null", "$e", []
            )).toBe(true);
        });

        it("should evaluate boolean comparison", () => {
            const item = {voided: false};
            expect(JsFallbackFilterEvaluator._evaluateAtomicCondition(
                item, "$e.voided = false", "$e", []
            )).toBe(true);
            expect(JsFallbackFilterEvaluator._evaluateAtomicCondition(
                item, "$e.voided = true", "$e", []
            )).toBe(false);
        });

        it("should evaluate $N parameter substitution", () => {
            const item = {uuid: "abc"};
            expect(JsFallbackFilterEvaluator._evaluateAtomicCondition(
                item, "$e.uuid = $0", "$e", ["abc"]
            )).toBe(true);
            expect(JsFallbackFilterEvaluator._evaluateAtomicCondition(
                item, "$e.uuid = $0", "$e", ["def"]
            )).toBe(false);
        });

        it("should return false when field is null and comparing to non-null", () => {
            const item = {name: null};
            expect(JsFallbackFilterEvaluator._evaluateAtomicCondition(
                item, '$e.name = "Alice"', "$e", []
            )).toBe(false);
        });
    });

    // ──── apply() chaining ────

    describe("apply — sequential filter chaining", () => {
        it("should apply two filters sequentially", () => {
            const entities = [
                makeEntity({uuid: "1", typeUuid: "t1", level: 1}),
                makeEntity({uuid: "2", typeUuid: "t1", level: 2}),
                makeEntity({uuid: "3", typeUuid: "t2", level: 3}),
            ];
            // First: DISTINCT by typeUuid → keeps uuid=1 (t1), uuid=3 (t2)
            // Second: DISTINCT by level → uuid=1 (level 1), uuid=3 (level 3) — both unique, both kept
            const result = JsFallbackFilterEvaluator.apply(
                entities,
                [
                    {query: "TRUEPREDICATE DISTINCT(typeUuid)", args: []},
                    {query: "TRUEPREDICATE DISTINCT(level)", args: []},
                ],
                "AddressLevel"
            );
            expect(result).toHaveLength(2);
            expect(result.map(e => e.uuid)).toEqual(["1", "3"]);
        });

        it("should stop pipeline when a filter reduces to empty", () => {
            const entities = [makeEntity({uuid: "1"}), makeEntity({uuid: "2"})];
            const result = JsFallbackFilterEvaluator.apply(
                entities,
                [
                    {query: "@links.@count == 0", args: []}, // returns empty
                    {query: "TRUEPREDICATE DISTINCT(uuid)", args: []}, // never reached
                ],
                "Individual"
            );
            expect(result).toEqual([]);
        });
    });

    // ──── Unrecognized query ────

    describe("unrecognized fallback query", () => {
        it("should pass through entities and log warning", () => {
            const entities = [makeEntity({uuid: "1"})];
            const result = JsFallbackFilterEvaluator.apply(
                entities,
                [{query: "SOME UNKNOWN QUERY PATTERN", args: []}],
                "TestSchema"
            );
            expect(result).toEqual(entities);
            expect(console.warn).toHaveBeenCalledWith(
                expect.stringContaining("unrecognized fallback query for TestSchema")
            );
        });
    });
});
