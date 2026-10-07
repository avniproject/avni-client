import {openSeededDb, selectsFrom} from "./lazyFixture";
import {LAZY_STATE} from "../../../../src/framework/db/LazyGroup";

describe("LazyGroup", () => {
    let db;

    beforeEach(() => {
        db = openSeededDb();
        db.hydrator.takeLazyStats();
        db.selects.length = 0;
    });

    afterEach(() => db.rawDb.close());

    const encounterGroup = () => db.hydrator.createLazyGroup("Encounter", db.rowsOf("encounter"));

    describe("rows", () => {
        it("builds nothing until a row is read, and each row once", () => {
            const group = encounterGroup();
            expect(group.size).toBe(4);
            expect(db.hydrator.lazyStats.rowsBuilt).toBe(0);

            const first = group.buildAt(1);
            expect(group.buildAt(1)).toBe(first);
            expect(db.hydrator.lazyStats.rowsBuilt).toBe(1);
        });

        it("converts scalars as the eager hydrator does", () => {
            const encounter = encounterGroup().buildAt(0);
            expect(encounter.uuid).toBe("enc-1a");
            expect(encounter.voided).toBe(false);
            expect(encounter.encounterDateTime).toEqual(new Date("2026-09-01T10:00:00.000Z"));
        });

        it("reads a null reference as null without a query", () => {
            const encounter = encounterGroup().buildAt(1);
            expect(encounter.latestEntityApprovalStatus).toBeNull();
            expect(Object.getOwnPropertyDescriptor(encounter, "latestEntityApprovalStatus").get).toBeUndefined();
            expect(db.selects).toEqual([]);
        });

        it("returns null outside the group", () => {
            const group = encounterGroup();
            expect(group.buildAt(-1)).toBeNull();
            expect(group.buildAt(4)).toBeNull();
        });

        it("finds a row by uuid, and nothing for an unknown one", () => {
            const group = encounterGroup();
            expect(group.buildByUuid("enc-2a").uuid).toBe("enc-2a");
            expect(group.buildByUuid("enc-2a")).toBe(group.buildAt(2));
            expect(group.buildByUuid("nope")).toBeUndefined();
        });

        it("hides its bookkeeping from enumeration", () => {
            const encounter = encounterGroup().buildAt(0);
            expect(Object.keys(encounter)).not.toContain("row");
            expect(Object.getOwnPropertySymbols(encounter).length).toBe(1);
        });
    });

    describe("references", () => {
        it("loads a reference for every row of the group with one query", () => {
            const group = encounterGroup();
            const names = [0, 1, 2].map(i => group.buildAt(i).individual.firstName);

            expect(names).toEqual(["Asha", "Asha", "Bina"]);
            expect(selectsFrom(db.selects, "individual")).toBe(1);
            expect(group.buildAt(0).individual).toBe(group.buildAt(1).individual);
        });

        it("batches nested references level by level", () => {
            const group = db.hydrator.createLazyGroup("ProgramEncounter", db.rowsOf("program_encounter"));
            const names = [0, 1, 2].map(i => group.buildAt(i).programEnrolment.individual.firstName);

            expect(names).toEqual(["Asha", "Asha", "Bina"]);
            expect(selectsFrom(db.selects, "program_enrolment")).toBe(1);
            expect(selectsFrom(db.selects, "individual")).toBe(1);
        });

        it("serves reference data from the cache without a query", () => {
            const encounter = encounterGroup().buildAt(0);
            expect(encounter.encounterType.name).toBe("Visit");
            expect(selectsFrom(db.selects, "encounter_type")).toBe(0);
        });

        it("gives a missing row the {uuid} placeholder, as the eager hydrator does", () => {
            const orphan = encounterGroup().buildAt(3);
            expect(orphan.individual).toEqual({uuid: "ind-missing"});
        });

        it("loads a reference for the read row's window only, within SQLite's 999-parameter limit", () => {
            const many = Array.from({length: 1200}, (_x, i) => ["Individual", {uuid: `bulk-${i}`, firstName: `B${i}`, subjectType: {uuid: "st-person"}, registrationDate: new Date(0), voided: false, observations: []}]);
            const visits = many.map(([, ind], i) => ["Encounter", {uuid: `bulk-enc-${i}`, encounterType: {uuid: "et-visit"}, individual: {uuid: ind.uuid}, voided: false, observations: []}]);
            db.rawDb.close();
            db = openSeededDb([...many, ...visits]);
            db.selects.length = 0;

            const group = db.hydrator.createLazyGroup("Encounter", db.rowsOf("encounter"));
            const last = group.buildAt(group.size - 1);

            expect(last.individual.firstName).toBe("B1199");
            expect(selectsFrom(db.selects, "individual")).toBe(1);
        });
    });

    describe("lists", () => {
        const individualGroup = () => db.hydrator.createLazyGroup("Individual", db.rowsOf("individual"));

        it("loads a list for every row of the group with one query, in today's order", () => {
            const group = individualGroup();
            const visits = [0, 1].map(i => group.buildAt(i).encounters.map(e => e.uuid));

            expect(visits).toEqual([["enc-1a", "enc-1b"], ["enc-2a"]]);
            expect(selectsFrom(db.selects, "encounter")).toBe(1);
        });

        it("answers a child's reference to its parent from the parent, without a query", () => {
            const asha = individualGroup().buildAt(0);
            db.selects.length = 0;

            expect(asha.encounters[0].individual).toBe(asha);
            expect(selectsFrom(db.selects, "individual")).toBe(0);
        });

        it("batches nested lists level by level", () => {
            const group = individualGroup();
            const counts = [0, 1].map(i => group.buildAt(i).enrolments.map(enl => enl.encounters.length));

            expect(counts).toEqual([[2], [1]]);
            expect(selectsFrom(db.selects, "program_enrolment")).toBe(1);
            expect(selectsFrom(db.selects, "program_encounter")).toBe(1);
        });

        it("follows the explicit foreign key for lists with two links back to the parent", () => {
            const group = individualGroup();
            const asha = group.buildAt(0);
            const household = group.buildAt(2);

            expect(asha.groups.map(gs => gs.uuid)).toEqual(["gs-1"]);
            expect(household.groupSubjects.map(gs => gs.memberSubject.uuid)).toEqual(["ind-1"]);
            expect(asha.groupSubjects).toEqual([]);
        });

        it("reads an empty list as empty, not as unloaded", () => {
            expect(individualGroup().buildAt(3).encounters).toEqual([]);
        });

        it("gives a list on a schema without a table an empty array", () => {
            const group = db.hydrator.createLazyGroup("Individual", db.rowsOf("individual"));
            db.hydrator.tableMetaMap.delete("Comment");
            expect(group.buildAt(0).comments).toEqual([]);
        });
    });

    describe("embedded values", () => {
        it("parses observations only when read", () => {
            const group = encounterGroup();
            group.buildAll();
            expect(db.hydrator.lazyStats.embeddedParsed).toBe(0);

            const observations = group.buildAt(0).observations;
            expect(db.hydrator.lazyStats.embeddedParsed).toBe(1);
            expect(JSON.parse(observations[0].valueJSON)).toEqual({answer: 51});
        });

        it("resolves observation concepts from the concept cache, built once on first need", () => {
            delete db.hydrator.referenceDataCache.Concept;
            const group = encounterGroup();
            const names = [0, 1, 2].map(i => group.buildAt(i).observations[0].concept.name);

            expect(names).toEqual(["Weight", "Weight", "Weight"]);
            expect(selectsFrom(db.selects, "concept")).toBe(1);
        });

        it("resolves a JSON uuid-array list through the reference cache", () => {
            const card = db.hydrator.createLazyGroup("ReportCard", db.rowsOf("report_card")).buildAt(0);
            expect(card.standardReportCardInputSubjectTypes.map(st => st.name)).toEqual(["Person"]);
        });

        it("gives a user subject without an address the placeholder address, and a person none", () => {
            const group = db.hydrator.createLazyGroup("Individual", db.rowsOf("individual"));
            expect(group.buildAt(3).lowestAddressLevel.locationProperties).toEqual([]);
            expect(group.buildAt(0).lowestAddressLevel).toBeNull();
        });
    });

    describe("getters and writes", () => {
        it("lets a failed read be retried", () => {
            const encounter = encounterGroup().buildAt(0);
            const selectIn = jest.spyOn(db.hydrator, "selectIn").mockImplementationOnce(() => { throw new Error("database is locked"); });

            expect(() => encounter.individual).toThrow("database is locked");
            expect(encounter.individual.firstName).toBe("Asha");
            selectIn.mockRestore();
        });

        it("keeps an assigned value", () => {
            const encounter = encounterGroup().buildAt(0);
            encounter.individual = {uuid: "ind-2"};
            expect(encounter.individual).toEqual({uuid: "ind-2"});
            expect(selectsFrom(db.selects, "individual")).toBe(0);
        });

        it("flattens an unread lazy object to its stored row without loading anything", () => {
            const stored = db.rowsOf("encounter")[0];
            const encounter = encounterGroup().buildAt(0);

            const flat = db.hydrator.flatten("Encounter", encounter);

            expect(db.selects).toEqual([]);
            expect(flat.individual_uuid).toBe(stored.individual_uuid);
            expect(flat.latest_entity_approval_status_uuid).toBe(stored.latest_entity_approval_status_uuid);
            expect(flat.observations).toBe(stored.observations);
            expect(flat.encounter_date_time).toBe(stored.encounter_date_time);
        });

        it("saves an edited lazy object with every unread value unchanged", () => {
            const before = db.rowsOf("encounter")[0];
            const encounter = encounterGroup().buildAt(0);
            encounter.voided = true;

            db.proxy.write(() => db.proxy.create("Encounter", encounter, true, {skipHydration: true}));

            expect(db.rowsOf("encounter")[0]).toEqual({...before, voided: 1});
        });

        it("flattens an assigned lazy reference to the assigned uuid without loading anything", () => {
            const encounter = encounterGroup().buildAt(0);
            encounter.individual = {uuid: "ind-2"};

            const flat = db.hydrator.flatten("Encounter", encounter);

            expect(flat.individual_uuid).toBe("ind-2");
            expect(db.selects).toEqual([]);
        });

        it("flattens an assigned embedded value instead of the stored one", () => {
            const encounter = encounterGroup().buildAt(0);
            const assigned = [{concept: {uuid: "c-weight"}, valueJSON: JSON.stringify({answer: 99})}];
            encounter.observations = assigned;

            const flat = db.hydrator.flatten("Encounter", encounter);

            expect(JSON.parse(flat.observations)).toEqual(assigned);
        });

        it("saves an assigned lazy reference", () => {
            const encounter = encounterGroup().buildAt(0);
            encounter.individual = {uuid: "ind-2"};

            db.proxy.write(() => db.proxy.create("Encounter", encounter, true, {skipHydration: true}));

            expect(db.rowsOf("encounter")[0].individual_uuid).toBe("ind-2");
        });

        it("costs at most one query per property when a one-row object is copied", () => {
            const individual = db.hydrator.createLazyGroup("Individual", db.rowsOf("individual").slice(0, 1)).buildAt(0);
            const copy = {...individual};

            expect(copy.encounters.map(e => e.uuid)).toEqual(["enc-1a", "enc-1b"]);
            const perTable = db.selects.reduce((acc, sql) => {
                const table = sql.match(/FROM (\w+)/)[1];
                return {...acc, [table]: (acc[table] || 0) + 1};
            }, {});
            Object.values(perTable).forEach(count => expect(count).toBeLessThanOrEqual(2));
        });
    });

    describe("sealing at the end of a scope", () => {
        const individualGroup = () => db.hydrator.createLazyGroup("Individual", db.rowsOf("individual"));

        it("drops a window's built rows and loaded children, keeping what a returned row already read", () => {
            db.hydrator.beginLazyScope();
            const group = individualGroup();
            const asha = group.buildAt(0);
            const visits = asha.encounters.map(e => e.uuid);
            group.buildAt(1).encounters;
            db.hydrator.endLazyScope();

            const window = asha[LAZY_STATE].group;
            expect(window._listGroups.size).toBe(0);
            expect(window._referenceGroups.size).toBe(0);
            expect(window._built.every(built => built === undefined)).toBe(true);
            expect(asha.encounters[0][LAZY_STATE].group.parentLink).toBeNull();
            expect(asha.encounters.map(e => e.uuid)).toEqual(visits);
        });

        it("still loads an unread property in one batch for the window after sealing", () => {
            db.hydrator.beginLazyScope();
            const group = individualGroup();
            const asha = group.buildAt(0);
            const bina = group.buildAt(1);
            db.hydrator.endLazyScope();
            db.selects.length = 0;

            expect(asha.enrolments.map(e => e.uuid)).toEqual(["enl-1"]);
            expect(bina.enrolments.map(e => e.uuid)).toEqual(["enl-2"]);
            expect(selectsFrom(db.selects, "program_enrolment")).toBe(1);
        });

        it("seals an inner scope's windows only when the outermost scope ends", () => {
            db.hydrator.beginLazyScope();
            db.hydrator.beginLazyScope();
            const asha = individualGroup().buildAt(0);
            asha.encounters;
            db.hydrator.endLazyScope();
            expect(asha[LAZY_STATE].group._listGroups.size).toBe(1);

            db.hydrator.endLazyScope();
            expect(asha[LAZY_STATE].group._listGroups.size).toBe(0);
        });

        it("seals nothing created outside a scope", () => {
            const asha = individualGroup().buildAt(0);
            asha.encounters;
            db.hydrator.beginLazyScope();
            db.hydrator.endLazyScope();

            expect(asha[LAZY_STATE].group._listGroups.size).toBe(1);
        });
    });

    describe("memory", () => {
        const bulkVisits = (count) => {
            const subjects = Array.from({length: count}, (_x, i) => ["Individual", {uuid: `mem-${i}`, firstName: `M${i}`, subjectType: {uuid: "st-person"}, registrationDate: new Date(0), voided: false, observations: []}]);
            const visits = subjects.map(([, ind], i) => ["Encounter", {uuid: `mem-enc-${i}`, encounterType: {uuid: "et-visit"}, individual: {uuid: ind.uuid}, voided: false, observations: []}]);
            return [...subjects, ...visits];
        };

        it("shares one getter per property across rows instead of a function per row", () => {
            const group = encounterGroup();
            const getterOf = (row, prop) => Object.getOwnPropertyDescriptor(row, prop).get;

            expect(getterOf(group.buildAt(0), "individual")).toBe(getterOf(group.buildAt(2), "individual"));
            expect(getterOf(group.buildAt(0), "observations")).toBe(getterOf(group.buildAt(1), "observations"));
        });

        it("ties a row to its window of at most 999 rows, not to the whole result", () => {
            db.rawDb.close();
            db = openSeededDb(bulkVisits(2500));
            db.selects.length = 0;
            const group = db.hydrator.createLazyGroup("Encounter", db.rowsOf("encounter"));
            const last = group.buildAt(group.size - 1);

            expect(last.individual.firstName).toBe("M2499");
            expect(last[LAZY_STATE].group.size).toBeLessThanOrEqual(999);
            expect(last.individual[LAZY_STATE].group.size).toBeLessThanOrEqual(999);
        });

        it("still batches a reference read across every window with one query per window", () => {
            db.rawDb.close();
            db = openSeededDb(bulkVisits(2500));
            db.selects.length = 0;
            const group = db.hydrator.createLazyGroup("Encounter", db.rowsOf("encounter"));
            const names = group.buildAll().map(e => e.individual.firstName);

            expect(names.filter(n => n && n.startsWith("M"))).toHaveLength(2500);
            expect(selectsFrom(db.selects, "individual")).toBe(Math.ceil(group.size / 999));
        });
    });
});
