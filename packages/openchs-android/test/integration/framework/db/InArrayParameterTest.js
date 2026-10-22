import {openSeededDb} from "./lazyFixture";

const uuidsOf = results => Array.from(results).map(i => i.uuid).sort();

describe("IN with an array parameter, on real SQLite", () => {
    let db;
    beforeEach(() => {
        db = openSeededDb();
    });
    afterEach(() => db.rawDb.close());

    it("returns only the subjects whose uuid is in the array", () => {
        const results = db.proxy.objects("Individual").filtered("voided = false AND uuid IN $0", ["ind-2", "not-there"]);
        expect(uuidsOf(results)).toEqual(["ind-2"]);
    });

    it("returns nothing for an empty array", () => {
        expect(uuidsOf(db.proxy.objects("Individual").filtered("uuid IN $0", []))).toEqual([]);
    });

    it("narrows a chained query the same way", () => {
        const results = db.proxy.objects("Individual")
            .filtered("voided = false AND uuid IN $0", ["ind-1", "ind-2"])
            .filtered("uuid IN $0", ["ind-2"]);
        expect(uuidsOf(results)).toEqual(["ind-2"]);
    });

    it("matches dates in the array against a date column", () => {
        const at = new Date("2026-09-01T10:00:00.000Z");
        const results = db.proxy.objects("Individual").filtered("uuid IN $0 AND registrationDate IN $1", ["ind-1", "ind-2"], [at]);
        expect(uuidsOf(results)).toEqual(["ind-1", "ind-2"]);
    });

    it("accepts more values than SQLite allows bound parameters in one statement", () => {
        const many = Array.from({length: 40000}, (_, i) => `missing-${i}`).concat(["ind-1"]);
        expect(uuidsOf(db.proxy.objects("Individual").filtered("uuid IN $0", many))).toEqual(["ind-1"]);
    });
});
