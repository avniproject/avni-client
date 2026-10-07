import {openSeededDb, selectsFrom} from "./lazyFixture";

describe("SqliteResultsProxy over lazy groups", () => {
    let db;

    beforeEach(() => {
        db = openSeededDb();
        db.hydrator.takeLazyStats();
        db.selects.length = 0;
    });

    afterEach(() => db.rawDb.close());

    it("answers .length from the query alone, and indexing builds one row", () => {
        const visits = db.proxy.objects("Encounter");
        expect(visits.length).toBe(4);
        expect(db.hydrator.lazyStats.rowsBuilt).toBe(0);

        expect(visits[2].uuid).toBe("enc-2a");
        expect(db.hydrator.lazyStats.rowsBuilt).toBe(1);
        expect(db.selects.length).toBe(1);
    });

    it("runs a rule-shaped filter with one query per level", () => {
        const visits = db.proxy.objects("Encounter")
            .filter(e => e.encounterType.name === "Visit" && e.individual.firstName === "Asha");

        expect(visits.map(e => e.uuid)).toEqual(["enc-1a", "enc-1b"]);
        expect(selectsFrom(db.selects, "encounter")).toBe(1);
        expect(selectsFrom(db.selects, "individual")).toBe(1);
    });

    it("applies a JS fallback filter to built rows", () => {
        const withWeight = db.proxy.objects("Encounter")
            .filtered('SUBQUERY(observations, $o, $o.concept.uuid = "c-weight").@count > 0');
        expect(withWeight.map(e => e.uuid)).toEqual(["enc-1a", "enc-1b", "enc-2a"]);
        expect(withWeight.length).toBe(3);
    });

    it("keeps today's order and slices lazily", () => {
        const sorted = db.proxy.objects("Individual").sorted("firstName", true);
        expect(sorted.slice(0, 2).map(i => i.firstName)).toEqual(["Worker", "Home"]);
        expect(db.hydrator.lazyStats.rowsBuilt).toBe(2);
        expect(Array.from(sorted).map(i => i.firstName)).toEqual(["Worker", "Home", "Bina", "Asha"]);
    });

    it("shares a cached group between identical queries, and still resolves after the cache ends", () => {
        db.proxy.beginQueryCache();
        const first = db.proxy.objects("Encounter").filtered("voided = false");
        const second = db.proxy.objects("Encounter").filtered("voided = false");
        expect(first.length).toBe(4);
        expect(second.length).toBe(4);
        db.proxy.endQueryCache();

        expect(selectsFrom(db.selects, "encounter")).toBe(1);
        expect(second[0].individual.firstName).toBe("Asha");
    });

    it("handles an empty result without building or querying further", () => {
        const none = db.proxy.objects("Encounter").filtered("uuid = $0", "nope");
        expect(none.length).toBe(0);
        expect(none.isEmpty()).toBe(true);
        expect([...none]).toEqual([]);
        expect(none[0]).toBeNull();
        expect(db.selects.length).toBe(1);
    });

    it("still materialises eagerly when the parity tests ask for the old path", () => {
        db.hydrator.eagerReferenceMode = true;
        const visits = db.proxy.objects("Encounter");
        expect(visits.length).toBe(4);
        expect(db.hydrator.lazyStats.rowsBuilt).toBe(0);
        expect(visits[0].individual.firstName).toBe("Asha");
    });

    it("looks a subject up by primary key without loading its graph", () => {
        const asha = db.proxy.objectForPrimaryKey("Individual", "ind-1");
        expect(asha.uuid).toBe("ind-1");
        expect(db.selects.length).toBe(1);
        expect(asha.encounters.length).toBe(2);
    });

    it("re-reads a saved entity lazily", () => {
        const saved = db.proxy.write(() => db.proxy.create("Encounter", {uuid: "enc-new", encounterType: {uuid: "et-visit"}, individual: {uuid: "ind-2"}, voided: false, observations: []}, true));
        db.selects.length = 0;
        expect(saved.individual.firstName).toBe("Bina");
        expect(selectsFrom(db.selects, "individual")).toBe(1);
    });

    it("reports and resets the counters", () => {
        db.proxy.objects("Encounter")[0].individual;
        expect(db.proxy.takeLazyStats()).toEqual({rowsBuilt: 2, inQueries: 1, embeddedParsed: 0});
        expect(db.proxy.takeLazyStats()).toEqual({rowsBuilt: 0, inQueries: 0, embeddedParsed: 0});
    });

    it("eager reference mode loads a nested list that shares its foreign key with an outer one", () => {
        db.proxy.write(() => db.proxy.create("EntityApprovalStatus", {uuid: "eas-ind1", entityUUID: "ind-1", entityType: "Individual", approvalStatus: {uuid: "as-approved"}, statusDateTime: new Date("2026-09-01T10:00:00.000Z"), voided: false, observations: []}, true));
        db.hydrator.eagerReferenceMode = true;
        const subject = Array.from(db.proxy.objects("Individual")).find(i => i.uuid === "ind-1");
        const encounter = Array.from(subject.encounters).find(e => e.uuid === "enc-1a");
        expect(Array.from(subject.approvalStatuses).map(a => a.uuid)).toEqual(["eas-ind1"]);
        expect(Array.from(encounter.approvalStatuses).map(a => a.uuid)).toEqual(["eas-1a"]);
    });

    it("builds the default reference caches even when the concept cache was built first", () => {
        Object.keys(db.hydrator.referenceDataCache).forEach(k => delete db.hydrator.referenceDataCache[k]);
        db.hydrator.ensureConceptCache();
        db.proxy._referenceCacheBuilt = false;

        db.proxy.objects("Encounter");

        expect(db.hydrator.referenceDataCache.EncounterType).toBeDefined();
    });
});
