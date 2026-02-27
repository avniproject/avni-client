import RealmQueryParser from "../../../src/framework/db/RealmQueryParser";

describe("RealmQueryParser", () => {

    describe("simple comparisons", () => {
        it("should parse equality with string literal", () => {
            const result = RealmQueryParser.parse('uuid = "abc-123"');
            expect(result.unsupported).toBe(false);
            expect(result.where).toBe('t0."uuid" = ?');
            expect(result.params).toEqual(["abc-123"]);
        });

        it("should parse equality with single-quoted string", () => {
            const result = RealmQueryParser.parse("name = 'John'");
            expect(result.unsupported).toBe(false);
            expect(result.where).toBe('t0."name" = ?');
            expect(result.params).toEqual(["John"]);
        });

        it("should parse boolean value false", () => {
            const result = RealmQueryParser.parse("voided = false");
            expect(result.unsupported).toBe(false);
            expect(result.where).toBe('t0."voided" = ?');
            expect(result.params).toEqual([0]);
        });

        it("should parse boolean value true", () => {
            const result = RealmQueryParser.parse("active = true");
            expect(result.unsupported).toBe(false);
            expect(result.where).toBe('t0."active" = ?');
            expect(result.params).toEqual([1]);
        });

        it("should parse numeric value", () => {
            const result = RealmQueryParser.parse("level = 3.5");
            expect(result.unsupported).toBe(false);
            expect(result.where).toBe('t0."level" = ?');
            expect(result.params).toEqual([3.5]);
        });

        it("should parse null comparison (IS NULL)", () => {
            const result = RealmQueryParser.parse("encounterDateTime = null");
            expect(result.unsupported).toBe(false);
            expect(result.where).toBe('t0."encounter_date_time" IS NULL');
            expect(result.params).toEqual([]);
        });

        it("should parse not-null comparison (IS NOT NULL)", () => {
            const result = RealmQueryParser.parse("encounterDateTime != null");
            expect(result.unsupported).toBe(false);
            expect(result.where).toBe('t0."encounter_date_time" IS NOT NULL');
        });

        it("should parse inequality operators", () => {
            const result = RealmQueryParser.parse("level > 2");
            expect(result.where).toBe('t0."level" > ?');
            expect(result.params).toEqual([2]);
        });

        it("should handle <> as !=", () => {
            const result = RealmQueryParser.parse("level <> 0");
            expect(result.where).toBe('t0."level" != ?');
            expect(result.params).toEqual([0]);
        });
    });

    describe("parameter substitution", () => {
        it("should substitute $0", () => {
            const result = RealmQueryParser.parse("uuid = $0", ["my-uuid"]);
            expect(result.where).toBe('t0."uuid" = ?');
            expect(result.params).toEqual(["my-uuid"]);
        });

        it("should substitute multiple parameters", () => {
            const result = RealmQueryParser.parse("name = $0 AND level = $1", ["John", 5]);
            expect(result.where).toBe('(t0."name" = ? AND t0."level" = ?)');
            expect(result.params).toEqual(["John", 5]);
        });

        it("should handle Date parameter", () => {
            const date = new Date(2024, 0, 15);
            const result = RealmQueryParser.parse("registrationDate > $0", [date]);
            expect(result.where).toBe('t0."registration_date" > ?');
            expect(result.params).toEqual([date.getTime()]);
        });
    });

    describe("logical operators", () => {
        it("should parse AND", () => {
            const result = RealmQueryParser.parse("voided = false AND active = true");
            expect(result.where).toBe('(t0."voided" = ? AND t0."active" = ?)');
            expect(result.params).toEqual([0, 1]);
        });

        it("should parse OR", () => {
            const result = RealmQueryParser.parse('name = "a" OR name = "b"');
            expect(result.where).toBe('(t0."name" = ? OR t0."name" = ?)');
            expect(result.params).toEqual(["a", "b"]);
        });

        it("should parse NOT", () => {
            const result = RealmQueryParser.parse("NOT voided = true");
            expect(result.where).toBe('NOT (t0."voided" = ?)');
            expect(result.params).toEqual([1]);
        });

        it("should handle parentheses grouping", () => {
            const result = RealmQueryParser.parse('(name = "a" OR name = "b") AND voided = false');
            expect(result.where).toBe('((t0."name" = ? OR t0."name" = ?) AND t0."voided" = ?)');
            expect(result.params).toEqual(["a", "b", 0]);
        });
    });

    describe("string operators", () => {
        it("should parse CONTAINS", () => {
            const result = RealmQueryParser.parse('name CONTAINS "john"');
            expect(result.where).toBe('t0."name" LIKE ?');
            expect(result.params).toEqual(["%john%"]);
        });

        it("should parse BEGINSWITH", () => {
            const result = RealmQueryParser.parse('name BEGINSWITH "Jo"');
            expect(result.where).toBe('t0."name" LIKE ?');
            expect(result.params).toEqual(["Jo%"]);
        });

        it("should parse ENDSWITH", () => {
            const result = RealmQueryParser.parse('name ENDSWITH "hn"');
            expect(result.where).toBe('t0."name" LIKE ?');
            expect(result.params).toEqual(["%hn"]);
        });

        it("should parse case-insensitive CONTAINS[c]", () => {
            const result = RealmQueryParser.parse('name CONTAINS[c] "john"');
            expect(result.where).toBe('LOWER(t0."name") LIKE ?');
            expect(result.params).toEqual(["%john%"]);
        });

        it("should parse LIKE with Realm wildcards", () => {
            const result = RealmQueryParser.parse('name LIKE "*test*"');
            expect(result.where).toContain('LIKE ?');
            expect(result.params[0]).toBe('%test%');
        });
    });

    describe("dot-notation (JOINs)", () => {
        const schemaMap = new Map();
        schemaMap.set("Individual", {
            name: "Individual",
            primaryKey: "uuid",
            properties: {
                uuid: "string",
                subjectType: {type: "object", objectType: "SubjectType"},
                lowestAddressLevel: {type: "object", objectType: "AddressLevel"},
            }
        });
        schemaMap.set("SubjectType", {
            name: "SubjectType",
            primaryKey: "uuid",
            properties: {
                uuid: "string",
                name: "string",
            }
        });
        schemaMap.set("Encounter", {
            name: "Encounter",
            primaryKey: "uuid",
            properties: {
                uuid: "string",
                individual: {type: "object", objectType: "Individual"},
            }
        });

        it("should generate JOIN for single dot-path", () => {
            const result = RealmQueryParser.parse(
                'subjectType.uuid = $0',
                ["st-uuid"],
                "Individual",
                schemaMap
            );
            expect(result.unsupported).toBe(false);
            expect(result.joins.length).toBe(1);
            expect(result.joins[0].table).toBe("subject_type");
            expect(result.where).toContain('t1."uuid" = ?');
            expect(result.params).toEqual(["st-uuid"]);
        });

        it("should generate chained JOINs for multi-level dot-path", () => {
            const result = RealmQueryParser.parse(
                'individual.subjectType.uuid = $0',
                ["st-uuid"],
                "Encounter",
                schemaMap
            );
            expect(result.unsupported).toBe(false);
            expect(result.joins.length).toBe(2);
            expect(result.where).toContain('t2."uuid" = ?');
        });

        it("should use aliasOffset to avoid collisions with existing JOINs from prior filtered() calls", () => {
            // Simulates chained .filtered() calls on GroupPrivileges:
            //   .filtered("group.uuid = $0", "g1")    → joins groups AS t1
            //   .filtered("privilege.name = $0", "x")  → should join privilege AS t2 (not t1 again)
            const groupPrivSchema = new Map();
            groupPrivSchema.set("GroupPrivileges", {
                name: "GroupPrivileges",
                primaryKey: "uuid",
                properties: {
                    uuid: "string",
                    group: {type: "object", objectType: "Groups"},
                    privilege: {type: "object", objectType: "Privilege"},
                    allow: {type: "bool", default: false},
                }
            });
            groupPrivSchema.set("Groups", {
                name: "Groups",
                primaryKey: "uuid",
                properties: {uuid: "string", name: "string"}
            });
            groupPrivSchema.set("Privilege", {
                name: "Privilege",
                primaryKey: "uuid",
                properties: {uuid: "string", name: "string", entityType: "string"}
            });

            // First filtered() call — aliasOffset=0
            const first = RealmQueryParser.parse(
                "group.uuid = $0",
                ["g1-uuid"],
                "GroupPrivileges",
                groupPrivSchema,
                0
            );
            expect(first.joins.length).toBe(1);
            expect(first.joins[0].alias).toBe("t1");
            expect(first.joins[0].table).toBe("groups");

            // Second filtered() call — aliasOffset=1 (one existing JOIN)
            const second = RealmQueryParser.parse(
                "privilege.name = $0 AND privilege.entityType = $1",
                ["Register subject", "Subject"],
                "GroupPrivileges",
                groupPrivSchema,
                1
            );
            expect(second.joins.length).toBe(1);
            expect(second.joins[0].alias).toBe("t2");
            expect(second.joins[0].table).toBe("privilege");
            expect(second.where).toContain('t2."name"');
            expect(second.where).toContain('t2."entity_type"');
        });
    });

    describe("camelCase to snake_case", () => {
        it("should convert simple camelCase", () => {
            const result = RealmQueryParser.parse("encounterDateTime = null");
            expect(result.where).toBe('t0."encounter_date_time" IS NULL');
        });

        it("should convert multi-word camelCase", () => {
            const result = RealmQueryParser.parse("latestEntityApprovalStatus = null");
            expect(result.where).toBe('t0."latest_entity_approval_status" IS NULL');
        });
    });

    describe("unsupported queries", () => {
        it("should flag SUBQUERY as unsupported", () => {
            const result = RealmQueryParser.parse(
                'SUBQUERY(encounters, $encounter, $encounter.voided == false).@count > 0'
            );
            expect(result.unsupported).toBe(true);
        });

        it("should flag TRUEPREDICATE as unsupported", () => {
            const result = RealmQueryParser.parse(
                'TRUEPREDICATE DISTINCT(observationsTypeEntityUUID)'
            );
            expect(result.unsupported).toBe(true);
        });

        it("should flag @links as unsupported", () => {
            const result = RealmQueryParser.parse(
                '@links.Individual.encounters.@count > 0'
            );
            expect(result.unsupported).toBe(true);
        });

        it("should flag @count as unsupported", () => {
            const result = RealmQueryParser.parse(
                'encounters.@count > 0'
            );
            expect(result.unsupported).toBe(true);
        });
    });

    describe("buildSelect", () => {
        it("should build a complete SELECT statement", () => {
            const parseResult = RealmQueryParser.parse("voided = false AND uuid = $0", ["test-uuid"]);
            const {sql, params} = RealmQueryParser.buildSelect("individual", parseResult);

            expect(sql).toContain("SELECT t0.* FROM individual AS t0");
            expect(sql).toContain("WHERE");
            expect(params).toEqual([0, "test-uuid"]);
        });

        it("should include JOINs in SELECT", () => {
            const schemaMap = new Map();
            schemaMap.set("Encounter", {
                name: "Encounter",
                primaryKey: "uuid",
                properties: {
                    uuid: "string",
                    individual: {type: "object", objectType: "Individual"},
                }
            });
            schemaMap.set("Individual", {
                name: "Individual",
                primaryKey: "uuid",
                properties: {uuid: "string"}
            });

            const parseResult = RealmQueryParser.parse(
                'individual.uuid = $0',
                ["ind-uuid"],
                "Encounter",
                schemaMap
            );
            const {sql} = RealmQueryParser.buildSelect("encounter", parseResult);

            expect(sql).toContain("LEFT JOIN individual AS t1");
        });

        it("should add ORDER BY and LIMIT", () => {
            const parseResult = RealmQueryParser.parse("voided = false");
            const {sql} = RealmQueryParser.buildSelect(
                "individual",
                parseResult,
                "t0.name ASC",
                10,
                20
            );

            expect(sql).toContain("ORDER BY t0.name ASC");
            expect(sql).toContain("LIMIT 10");
            expect(sql).toContain("OFFSET 20");
        });
    });

    describe("limit extraction", () => {
        it("should extract limit(N) and return it separately from the parsed query", () => {
            const result = RealmQueryParser.parse("hasMigrated = false limit(1)");
            expect(result.unsupported).toBe(false);
            expect(result.where).toContain('"has_migrated"');
            expect(result.limit).toBe(1);
        });

        it("should return limit for standalone limit(N) with no other filter", () => {
            const result = RealmQueryParser.parse("limit(5)");
            expect(result.unsupported).toBe(false);
            expect(result.where).toBe("1=1");
            expect(result.limit).toBe(5);
        });

        it("should return limit alongside unsupported query", () => {
            const result = RealmQueryParser.parse(
                'SUBQUERY(observations, $obs, $obs.concept.uuid = "c1").@count > 0 limit(5)'
            );
            expect(result.unsupported).toBe(true);
            expect(result.limit).toBe(5);
        });

        it("should return null limit when no limit(N) is present", () => {
            const result = RealmQueryParser.parse("voided = false");
            expect(result.limit).toBeNull();
        });

        it("should handle limit with surrounding whitespace", () => {
            const result = RealmQueryParser.parse("voided = false limit( 10 )");
            expect(result.unsupported).toBe(false);
            expect(result.limit).toBe(10);
        });

        it("should strip trailing AND left by limit removal", () => {
            // "voided = false AND limit(1)" → after stripping → "voided = false AND" → strip trailing AND
            const result = RealmQueryParser.parse("voided = false AND limit(1)");
            expect(result.unsupported).toBe(false);
            expect(result.where).toContain('"voided"');
            expect(result.limit).toBe(1);
        });
    });

    describe("edge cases", () => {
        it("should handle empty query", () => {
            const result = RealmQueryParser.parse("");
            expect(result.where).toBe("1=1");
            expect(result.params).toEqual([]);
        });

        it("should handle null query", () => {
            const result = RealmQueryParser.parse(null);
            expect(result.where).toBe("1=1");
        });

        it("should handle escaped quotes in strings", () => {
            const result = RealmQueryParser.parse(`name = "it's"`);
            expect(result.params).toEqual(["it's"]);
        });

        it("should handle multiple ANDs", () => {
            const result = RealmQueryParser.parse("a = 1 AND b = 2 AND c = 3");
            expect(result.params).toEqual([1, 2, 3]);
            expect(result.unsupported).toBe(false);
        });

        it("should handle complex OR-AND combination from real queries", () => {
            const result = RealmQueryParser.parse(
                'uuid = "abc" OR uuid = "def" OR uuid = "ghi"'
            );
            expect(result.params).toEqual(["abc", "def", "ghi"]);
            expect(result.unsupported).toBe(false);
        });
    });
});
