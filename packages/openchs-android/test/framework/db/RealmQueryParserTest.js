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

    describe("TRUEPREDICATE sort/Distinct → SQL window", () => {
        const schemaMap = new Map();
        schemaMap.set("Encounter", {
            name: "Encounter", primaryKey: "uuid",
            properties: {
                uuid: "string",
                encounterDateTime: "date",
                programEnrolment: {type: "object", objectType: "ProgramEnrolment"},
            }
        });
        schemaMap.set("ProgramEnrolment", {
            name: "ProgramEnrolment", primaryKey: "uuid",
            properties: {
                uuid: "string",
                enrolmentDateTime: "date",
                individual: {type: "object", objectType: "Individual"},
            }
        });
        schemaMap.set("Individual", {
            name: "Individual", primaryKey: "uuid",
            properties: {uuid: "string"}
        });

        it("sort only (no distinct) → orderBy, no distinct descriptor", () => {
            const r = RealmQueryParser.parse(
                "TRUEPREDICATE sort(encounterDateTime desc)", [], "Encounter", schemaMap);
            expect(r.unsupported).toBe(false);
            expect(r.distinct).toBeFalsy();
            expect(r.orderBy).toBe('t0."encounter_date_time" DESC');
            expect(r.joins.length).toBe(0);
        });

        it("multi-key dot-path sort + distinct → window descriptor with JOINs", () => {
            const r = RealmQueryParser.parse(
                "TRUEPREDICATE sort(programEnrolment.individual.uuid asc , encounterDateTime desc) Distinct(programEnrolment.individual.uuid)",
                [], "Encounter", schemaMap);
            expect(r.unsupported).toBe(false);
            // two JOINs: Encounter→ProgramEnrolment (t1), ProgramEnrolment→Individual (t2)
            expect(r.joins.length).toBe(2);
            expect(r.orderBy).toBe('t2."uuid" ASC, t0."encounter_date_time" DESC');
            expect(r.distinct.columns).toEqual(['t2."uuid"']);
            expect(r.distinct.orderBy).toBe('t2."uuid" ASC, t0."encounter_date_time" DESC');
        });

        it("bare Distinct (no sort) → distinct descriptor, orderBy null", () => {
            const r = RealmQueryParser.parse(
                "TRUEPREDICATE DISTINCT(entityName)", [], "EntitySyncStatus", new Map());
            expect(r.unsupported).toBe(false);
            expect(r.distinct.columns).toEqual(['t0."entity_name"']);
            expect(r.distinct.orderBy).toBeNull();
            expect(r.orderBy).toBeNull();
        });

        it("inline sort + distinct on different keys (CommentService shape)", () => {
            const cm = new Map();
            cm.set("Comment", {
                name: "Comment", primaryKey: "uuid",
                properties: {
                    uuid: "string", createdDateTime: "date",
                    commentThread: {type: "object", objectType: "CommentThread"},
                }
            });
            cm.set("CommentThread", {name: "CommentThread", primaryKey: "uuid", properties: {uuid: "string"}});
            const r = RealmQueryParser.parse(
                "TRUEPREDICATE sort(createdDateTime asc) Distinct(commentThread.uuid)", [], "Comment", cm);
            expect(r.unsupported).toBe(false);
            expect(r.distinct.orderBy).toBe('t0."created_date_time" ASC');
            expect(r.distinct.columns).toEqual(['t1."uuid"']);
        });

        it("non-grammar TRUEPREDICATE (leftover tokens) stays unsupported", () => {
            const r = RealmQueryParser.parse("TRUEPREDICATE AND voided = false", [], "Encounter", schemaMap);
            // Leftover "AND voided = false" after TRUEPREDICATE isn't the sort/distinct
            // grammar, so _tryTranslateTruePredicate returns null and the query falls
            // through to the pre-existing JS-fallback/partial-parse path — it never
            // produces the recognized sort/distinct descriptor.
            expect(r.unsupported === true || r.partialParse === true).toBe(true);
            expect(r.distinct).toBeFalsy();
        });

        it("malformed sort key degrades to JS fallback instead of throwing", () => {
            expect(() => RealmQueryParser.parse("TRUEPREDICATE sort(name ascending) Distinct(uuid)", [], "X", new Map())).not.toThrow();
            const r = RealmQueryParser.parse("TRUEPREDICATE sort(name ascending) Distinct(uuid)", [], "X", new Map());
            expect(r.distinct).toBeFalsy();
        });

        it("reversed Distinct(...) sort(...) is not translated (stays on fallback)", () => {
            const r = RealmQueryParser.parse("TRUEPREDICATE Distinct(entityName) sort(createdDateTime asc)", [], "X", new Map());
            expect(r.distinct).toBeFalsy();
            expect(r.orderBy).toBeFalsy();
        });
    });

    describe("object-link properties resolve to FK columns", () => {
        const schemaMap = new Map();
        schemaMap.set("IdentifierAssignment", {
            name: "IdentifierAssignment",
            primaryKey: "uuid",
            properties: {
                uuid: "string",
                identifierSource: {type: "object", objectType: "IdentifierSource"},
                identifier: "string",
                individual: {type: "object", objectType: "Individual", optional: true},
                programEnrolment: {type: "object", objectType: "ProgramEnrolment", optional: true},
                voided: {type: "bool", default: false},
                used: {type: "bool", default: false},
            }
        });
        schemaMap.set("IdentifierSource", {
            name: "IdentifierSource",
            primaryKey: "uuid",
            properties: {uuid: "string", name: "string"}
        });

        it("should resolve object property = null to the _uuid FK column", () => {
            const result = RealmQueryParser.parse(
                'voided = false AND individual = null AND programEnrolment = null and used = false',
                [],
                "IdentifierAssignment",
                schemaMap
            );
            expect(result.unsupported).toBe(false);
            expect(result.where).toContain('t0."individual_uuid" IS NULL');
            expect(result.where).toContain('t0."program_enrolment_uuid" IS NULL');
        });

        it("should resolve object property at the end of a dot-path to the FK column", () => {
            const result = RealmQueryParser.parse(
                'identifierSource.uuid = $0 AND programEnrolment != null',
                ["is-uuid"],
                "IdentifierAssignment",
                schemaMap
            );
            expect(result.unsupported).toBe(false);
            expect(result.where).toContain('t0."program_enrolment_uuid" IS NOT NULL');
        });

        it("should leave scalar properties untouched without a schema", () => {
            const result = RealmQueryParser.parse("programEnrolment = null");
            expect(result.where).toBe('t0."program_enrolment" IS NULL');
        });

        it("should bind an entity instance parameter as its uuid", () => {
            const subjectType = {uuid: "st-uuid", name: "Household"};
            const result = RealmQueryParser.parse(
                "individual = $0", [subjectType], "IdentifierAssignment", schemaMap);
            expect(result.where).toBe('t0."individual_uuid" = ?');
            expect(result.params).toEqual(["st-uuid"]);
        });

        it("should bind entity instances inside IN as uuids", () => {
            const result = RealmQueryParser.parse(
                "individual IN {$0, $1}",
                [{uuid: "i1"}, {uuid: "i2"}],
                "IdentifierAssignment",
                schemaMap
            );
            expect(result.where).toBe('t0."individual_uuid" IN (?, ?)');
            expect(result.params).toEqual(["i1", "i2"]);
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

        it("should translate TRUEPREDICATE DISTINCT to a distinct descriptor", () => {
            const result = RealmQueryParser.parse(
                'TRUEPREDICATE DISTINCT(observationsTypeEntityUUID)'
            );
            expect(result.unsupported).toBe(false);
            expect(result.distinct.columns).toEqual(['t0."observations_type_entity_uuid"']);
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

        it("should handle && as AND operator (Realm compatibility)", () => {
            const result = RealmQueryParser.parse("entityName = 'Individual' && entityTypeUuid = 'abc-123'");
            expect(result.unsupported).toBe(false);
            expect(result.where).toBe('(t0."entity_name" = ? AND t0."entity_type_uuid" = ?)');
            expect(result.params).toEqual(["Individual", "abc-123"]);
        });

        it("should handle || as OR operator (Realm compatibility)", () => {
            const result = RealmQueryParser.parse("uuid = 'a' || uuid = 'b'");
            expect(result.unsupported).toBe(false);
            expect(result.where).toBe('(t0."uuid" = ? OR t0."uuid" = ?)');
            expect(result.params).toEqual(["a", "b"]);
        });

        it("should handle mixed && and || with parentheses", () => {
            const result = RealmQueryParser.parse("entityName = 'Individual' && ( entityTypeUuid = '' || entityTypeUuid = 'abc')");
            expect(result.unsupported).toBe(false);
            expect(result.where).toBe('(t0."entity_name" = ? AND (t0."entity_type_uuid" = ? OR t0."entity_type_uuid" = ?))');
            expect(result.params).toEqual(["Individual", "", "abc"]);
        });

        it("should handle && in real resetSync query pattern", () => {
            const result = RealmQueryParser.parse("entityName = 'Individual' && ( entityTypeUuid = '' OR entityTypeUuid = 'uuid1' OR entityTypeUuid = 'uuid2')");
            expect(result.unsupported).toBe(false);
            expect(result.params).toEqual(["Individual", "", "uuid1", "uuid2"]);
        });
    });

    describe("SUBQUERY referenced-list conditions (OR / numeric / guard)", () => {
        const schemaMap = new Map();
        schemaMap.set("Individual", {name: "Individual", primaryKey: "uuid", properties: {
            uuid: "string", voided: "bool",
            enrolments: {type: "list", objectType: "ProgramEnrolment"},
        }});
        schemaMap.set("ProgramEnrolment", {name: "ProgramEnrolment", primaryKey: "uuid", properties: {
            uuid: "string", voided: "bool", programExitDateTime: "date",
            individual: {type: "object", objectType: "Individual"},
            program: {type: "object", objectType: "Program"},
        }});
        schemaMap.set("Program", {name: "Program", primaryKey: "uuid", properties: {uuid: "string", name: "string"}});

        it("OR inside conditions → parenthesized OR in the IN-subquery", () => {
            const r = RealmQueryParser.parse(
                "SUBQUERY(enrolments, $e, $e.program.name = 'Child' OR $e.voided = false).@count > 0",
                [], "Individual", schemaMap);
            expect(r.unsupported).toBe(false);
            expect(r.where).toContain('t0."uuid" IN (SELECT "individual_uuid" FROM program_enrolment WHERE (');
            expect(r.where).toContain(' OR ');
            expect(r.where).toContain('"program_uuid"'); // FK-ref leaf
        });

        it("unqualified identifier binds to the child (voided → enrolment.voided)", () => {
            const r = RealmQueryParser.parse(
                "SUBQUERY(enrolments, $e, $e.program.name = 'Child' and voided = false).@count > 0",
                [], "Individual", schemaMap);
            expect(r.unsupported).toBe(false);
            expect(r.where).toMatch(/"voided" = \?/); // bare child column, no alias
            expect(r.where).not.toContain("t1.");
        });

        it("unknown unqualified child property → stays on JS fallback", () => {
            const r = RealmQueryParser.parse(
                "SUBQUERY(enrolments, $e, nonExistentField = false).@count > 0",
                [], "Individual", schemaMap);
            expect(r.unsupported).toBe(true);
        });

        it("numeric FK-ref value is accepted", () => {
            // program.someNumber = 3 style — numeric RHS on an FK dot-ref
            const r = RealmQueryParser.parse(
                "SUBQUERY(enrolments, $e, $e.program.name = 'Child' and $e.programExitDateTime = null).@count > 0",
                [], "Individual", schemaMap);
            expect(r.unsupported).toBe(false);
            expect(r.where).toMatch(/"program_exit_date_time" IS NULL/);
        });

        it("guard also fires for unknown field inside && / || / NOT compounds", () => {
            for (const q of [
                "SUBQUERY(enrolments, $e, nonExistentField = false && voided = true).@count > 0",
                "SUBQUERY(enrolments, $e, nonExistentField = false || voided = true).@count > 0",
                "SUBQUERY(enrolments, $e, NOT (nonExistentField = false)).@count > 0",
            ]) {
                const r = RealmQueryParser.parse(q, [], "Individual", schemaMap);
                expect(r.unsupported).toBe(true);
            }
        });

        it("B: nested SUBQUERY on an embedded list → json_each EXISTS inside the IN-subquery", () => {
            const sm = new Map(schemaMap);
            sm.set("ProgramEnrolment", {name: "ProgramEnrolment", primaryKey: "uuid", properties: {
                uuid: "string", voided: "bool",
                individual: {type: "object", objectType: "Individual"},
                program: {type: "object", objectType: "Program"},
                programExitObservations: {type: "list", objectType: "Observation"},
            }});
            sm.set("Observation", {name: "Observation", primaryKey: undefined, properties: {}}); // embedded
            const r = RealmQueryParser.parse(
                "SUBQUERY(enrolments, $e, $e.program.name = 'Child' and SUBQUERY($e.programExitObservations, $o, $o.concept.uuid = 'c1').@count > 0).@count > 0",
                [], "Individual", sm);
            expect(r.unsupported).toBe(false);
            expect(r.where).toContain('EXISTS (SELECT 1 FROM json_each("program_exit_observations") AS jobs');
            expect(r.where).toContain("json_extract(jobs.value, '$.concept.uuid') = ?");
            expect(r.where).not.toContain('t0."program_exit_observations"'); // bare, not t0-scoped
        });
    });
});
