import {camelToSnake, schemaNameToTableName, normalizeRealmType} from "../../src/framework/db/SqliteUtils";

describe("SqliteUtils", () => {
    describe("camelToSnake", () => {
        it("converts simple camelCase", () => {
            expect(camelToSnake("dateOfBirth")).toBe("date_of_birth");
        });

        it("converts single word lowercase", () => {
            expect(camelToSnake("uuid")).toBe("uuid");
        });

        it("handles consecutive uppercase letters", () => {
            expect(camelToSnake("createdByUUID")).toBe("created_by_uuid");
        });

        it("converts PascalCase", () => {
            expect(camelToSnake("ProgramEnrolment")).toBe("program_enrolment");
        });

        it("handles multi-uppercase runs followed by lowercase", () => {
            expect(camelToSnake("ABCDef")).toBe("abc_def");
        });

        it("handles already snake_case", () => {
            expect(camelToSnake("already_snake")).toBe("already_snake");
        });

        it("handles single character", () => {
            expect(camelToSnake("a")).toBe("a");
        });

        it("handles numbers in names", () => {
            expect(camelToSnake("field1Value")).toBe("field1_value");
        });
    });

    describe("schemaNameToTableName", () => {
        it("converts schema name to table name", () => {
            expect(schemaNameToTableName("Individual")).toBe("individual");
        });

        it("converts multi-word schema name", () => {
            expect(schemaNameToTableName("ProgramEnrolment")).toBe("program_enrolment");
        });

        it("converts complex schema name", () => {
            expect(schemaNameToTableName("DashboardSectionCardMapping")).toBe("dashboard_section_card_mapping");
        });

        it("converts EntitySyncStatus", () => {
            expect(schemaNameToTableName("EntitySyncStatus")).toBe("entity_sync_status");
        });
    });

    describe("normalizeRealmType", () => {
        it("strips ? suffix from optional types", () => {
            expect(normalizeRealmType("date?")).toBe("date");
            expect(normalizeRealmType("string?")).toBe("string");
            expect(normalizeRealmType("bool?")).toBe("bool");
        });

        it("returns non-optional types unchanged", () => {
            expect(normalizeRealmType("string")).toBe("string");
            expect(normalizeRealmType("int")).toBe("int");
            expect(normalizeRealmType("date")).toBe("date");
        });

        it("handles non-string input", () => {
            expect(normalizeRealmType({type: "object"})).toEqual({type: "object"});
        });
    });
});
