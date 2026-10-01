import {parseDescriptors, extractTrailingCall, parseSortKeys, parseDistinctFields} from "../../../src/framework/db/SortDistinctGrammar";

describe("SortDistinctGrammar", () => {

    describe("parseDescriptors", () => {
        it("returns sort and Distinct in written order, with their bodies", () => {
            const {descriptors, rest} = parseDescriptors("sort(a asc , b desc) Distinct(c)");
            expect(descriptors.map(d => d.keyword)).toEqual(["sort", "distinct"]);
            expect(descriptors[0].body).toBe("a asc , b desc");
            expect(descriptors[1].body).toBe("c");
            expect(rest).toBe("");
        });

        it("keeps the order the query wrote them in", () => {
            const {descriptors} = parseDescriptors("Distinct(c) sort(a asc)");
            expect(descriptors.map(d => d.keyword)).toEqual(["distinct", "sort"]);
        });

        it("reports either descriptor alone", () => {
            expect(parseDescriptors("DISTINCT(entityName)").descriptors.map(d => d.keyword)).toEqual(["distinct"]);
            expect(parseDescriptors("SORT(createdDateTime desc)").descriptors.map(d => d.keyword)).toEqual(["sort"]);
        });

        it("hands back whatever isn't a descriptor as rest", () => {
            const {descriptors, rest} = parseDescriptors("AND voided = false sort(a asc)");
            expect(descriptors.map(d => d.keyword)).toEqual(["sort"]);
            expect(rest).toBe("AND voided = false");
        });

        it("needs the call parenthesis, so a field whose name starts with the keyword is not one", () => {
            const {descriptors, rest} = parseDescriptors("sort(sortOrder asc, distinctness desc)");
            expect(descriptors).toHaveLength(1);
            expect(descriptors[0].body).toBe("sortOrder asc, distinctness desc");
            expect(rest).toBe("");
        });

        it("does not read a word ending in the keyword as a call", () => {
            const {descriptors, rest} = parseDescriptors("resort(a asc)");
            expect(descriptors).toHaveLength(0);
            expect(rest).toBe("resort(a asc)");
        });

        it("lists a repeated descriptor rather than silently keeping one", () => {
            const {descriptors} = parseDescriptors("sort(a asc) sort(b desc)");
            expect(descriptors.map(d => d.body)).toEqual(["a asc", "b desc"]);
        });
    });

    describe("extractTrailingCall", () => {
        it("takes a sort anchored at the end and leaves the predicate intact", () => {
            const call = extractTrailingCall("voided = false SORT(name asc)", "sort");
            expect(call.body).toBe("name asc");
            expect(call.rest).toBe("voided = false");
        });

        it("ignores a call that isn't trailing", () => {
            expect(extractTrailingCall("SORT(name asc) AND voided = false", "sort")).toBeNull();
        });
    });

    describe("parseSortKeys", () => {
        it("parses multiple keys, both spellings of the direction, defaulting to ascending", () => {
            expect(parseSortKeys("a asc , b DESCENDING, c")).toEqual([
                {field: "a", desc: false},
                {field: "b", desc: true},
                {field: "c", desc: false},
            ]);
        });

        it("returns null for a key Realm itself rejects", () => {
            expect(parseSortKeys("name asc desc")).toBeNull();
            expect(parseSortKeys("")).toBeNull();
        });
    });

    describe("parseDistinctFields", () => {
        it("parses dot-paths and multiple fields", () => {
            expect(parseDistinctFields("programEnrolment.individual.uuid , typeUuid")).toEqual([
                "programEnrolment.individual.uuid", "typeUuid",
            ]);
        });

        it("returns null for an empty body", () => {
            expect(parseDistinctFields("  ")).toBeNull();
        });
    });
});
