import EntityHydrator from "../../../src/framework/db/EntityHydrator";

// A list property that falls below the hydration depth budget must still resolve when
// read, the way a Realm list does. Returning [] makes "not loaded" indistinguishable
// from "genuinely empty" — see #2061, where it left a group-attendance picker unfiltered.
describe("EntityHydrator lazy list hydration", () => {
    const realmSchemaMap = new Map();
    realmSchemaMap.set("Encounter", {
        name: "Encounter",
        primaryKey: "uuid",
        properties: {
            uuid: "string",
            individual: {type: "object", objectType: "Individual"},
            approvalStatuses: {type: "list", objectType: "EntityApprovalStatus"},
            voided: {type: "bool", default: false}
        }
    });
    realmSchemaMap.set("Individual", {
        name: "Individual",
        primaryKey: "uuid",
        properties: {
            uuid: "string",
            firstName: "string",
            groupSubjects: {type: "list", objectType: "GroupSubject"},
            encounters: {type: "list", objectType: "Encounter"}
        }
    });
    realmSchemaMap.set("EntityApprovalStatus", {
        name: "EntityApprovalStatus",
        primaryKey: "uuid",
        properties: {
            uuid: "string",
            status: "string"
        }
    });
    realmSchemaMap.set("GroupSubject", {
        name: "GroupSubject",
        primaryKey: "uuid",
        properties: {
            uuid: "string",
            groupSubject: {type: "object", objectType: "Individual"},
            memberSubject: {type: "object", objectType: "Individual"},
            voided: {type: "bool", default: false}
        }
    });
    // Shaped after the one self-referential FK in the real schemas:
    // ChecklistItemDetail.dependentOn is itself a ChecklistItemDetail, and
    // ChecklistItemDetail is a list on ChecklistDetail and on ChecklistItem.
    realmSchemaMap.set("ChecklistDetail", {
        name: "ChecklistDetail",
        primaryKey: "uuid",
        properties: {
            uuid: "string",
            items: {type: "list", objectType: "ChecklistItemDetail"}
        }
    });
    realmSchemaMap.set("ChecklistItemDetail", {
        name: "ChecklistItemDetail",
        primaryKey: "uuid",
        properties: {
            uuid: "string",
            dependentOn: {type: "object", objectType: "ChecklistItemDetail"}
        }
    });

    const tableMetaMap = new Map();
    tableMetaMap.set("Encounter", {tableName: "encounter", getColumn: () => undefined});
    tableMetaMap.set("Individual", {tableName: "individual", getColumn: () => undefined});
    tableMetaMap.set("GroupSubject", {
        tableName: "group_subject",
        getColumn: (n) => (n === "group_subject_uuid" || n === "member_subject_uuid") ? {} : undefined
    });
    tableMetaMap.set("EntityApprovalStatus", {
        tableName: "entity_approval_status",
        getColumn: (n) => n === "entity_uuid" ? {} : undefined
    });
    tableMetaMap.set("ChecklistDetail", {tableName: "checklist_detail", getColumn: () => undefined});
    tableMetaMap.set("ChecklistItemDetail", {
        tableName: "checklist_item_detail",
        getColumn: (n) => n === "checklist_detail_uuid" ? {} : undefined
    });

    const GROUP_UUID = "phulwari-uuid";
    const memberRows = _memberRows(5);
    const encounterRows = _encounterRows(3);

    function _memberRows(count) {
        return Array.from({length: count}, (_x, i) => ({
            uuid: `gs-${i}`,
            group_subject_uuid: GROUP_UUID,
            member_subject_uuid: `child-${i}`,
            voided: 0
        }));
    }

    function _encounterRows(count) {
        return Array.from({length: count}, (_x, i) => ({
            uuid: `enc-${i}`,
            individual_uuid: GROUP_UUID,
            voided: 0
        }));
    }

    // Answers the queries the hydrator makes: the group's Individual row, the
    // GroupSubject rows pointing back at it, its encounters, and each encounter's
    // approval statuses.
    function queryFor(sql, params) {
        if (sql.includes("FROM individual") && params[0] === GROUP_UUID)
            return [{uuid: GROUP_UUID, first_name: "Phulwari"}];
        if (sql.includes("FROM group_subject") && params[0] === GROUP_UUID)
            return memberRows;
        if (sql.includes("FROM encounter") && params[0] === GROUP_UUID)
            return encounterRows;
        if (sql.includes("FROM entity_approval_status"))
            return [{uuid: `eas-for-${params[0]}`, status: "Approved"}];
        if (sql.includes("FROM checklist_item_detail") && sql.includes('"checklist_detail_uuid"'))
            return [{uuid: "cid-1", checklist_detail_uuid: params[0], dependent_on_uuid: "cid-2"}];
        if (sql.includes("FROM checklist_item_detail"))
            return [cyclicItemDetails[params[0]]].filter(r => r != null);
        return [];
    }

    // cid-1 and cid-2 depend on each other. Malformed config rather than anything a
    // form designer can produce on purpose — but a property read must not blow the
    // stack over it, and before lazy lists resolved their children at depth 0 it didn't.
    const cyclicItemDetails = {
        "cid-1": {uuid: "cid-1", dependent_on_uuid: "cid-2"},
        "cid-2": {uuid: "cid-2", dependent_on_uuid: "cid-1"}
    };

    let hydrator;
    let executeQuery;

    beforeEach(() => {
        executeQuery = jest.fn(queryFor);
        hydrator = new EntityHydrator(tableMetaMap, realmSchemaMap, executeQuery, {});
    });

    const encounterRow = {uuid: "enc-uuid", individual_uuid: GROUP_UUID, voided: 0};

    it("resolves a list reached below the depth budget when it is read", () => {
        const encounter = hydrator.hydrate("Encounter", encounterRow, {depth: 1});

        expect(encounter.individual.groupSubjects.map(gs => gs.uuid))
            .toEqual(["gs-0", "gs-1", "gs-2", "gs-3", "gs-4"]);
    });

    it("defers a list while shallow mode is on, but still resolves it on read", () => {
        hydrator.setShallowMode(true);

        const encounter = hydrator.hydrate("Encounter", encounterRow, {depth: 1});
        // Shallow mode defers (no eager query) without freezing the list to [].
        expect(groupSubjectQueryCount()).toBe(0);

        const members = encounter.individual.groupSubjects;

        expect(members.map(gs => gs.uuid)).toEqual(["gs-0", "gs-1", "gs-2", "gs-3", "gs-4"]);
        expect(groupSubjectQueryCount()).toBe(1);
    });

    it("queries once however many times a lazy list is read", () => {
        const encounter = hydrator.hydrate("Encounter", encounterRow, {depth: 1});

        encounter.individual.groupSubjects;
        encounter.individual.groupSubjects;

        expect(groupSubjectQueryCount()).toBe(1);
    });

    it("keeps a list assignable, since model setters write through to the hydrated object", () => {
        const encounter = hydrator.hydrate("Encounter", encounterRow, {depth: 1});

        encounter.individual.groupSubjects = [{uuid: "replaced"}];

        expect(encounter.individual.groupSubjects).toEqual([{uuid: "replaced"}]);
    });

    // A lazy list resolves outside any batch preload, so anything it loads eagerly is an
    // N+1 on the UI thread: one query per child, per list, per FK. Children come back at
    // depth 0 — lazy lists of their own — and the parent is seeded into the session so
    // back-references to it don't re-read its row once per child.
    describe("cost of a first access", () => {
        it("resolves the children's own lists lazily rather than one query per child", () => {
            const individual = hydrator.hydrate("Individual", {uuid: GROUP_UUID, first_name: "Phulwari"}, {depth: 0});

            const encounters = individual.encounters;

            expect(encounters.map(e => e.uuid)).toEqual(["enc-0", "enc-1", "enc-2"]);
            expect(queryCount("entity_approval_status")).toBe(0);
        });

        it("still resolves a child's own list when that list is read", () => {
            const individual = hydrator.hydrate("Individual", {uuid: GROUP_UUID, first_name: "Phulwari"}, {depth: 0});

            const statuses = individual.encounters[0].approvalStatuses;

            expect(statuses.map(s => s.uuid)).toEqual(["eas-for-enc-0"]);
        });

        it("reads the parent row once, not once per child, for the children's back-reference", () => {
            const individual = hydrator.hydrate("Individual", {uuid: GROUP_UUID, first_name: "Phulwari"}, {depth: 0});

            const encounters = individual.encounters;

            expect(queryCount("encounter")).toBe(1);
            expect(queryCount("individual")).toBe(0);
            expect(encounters[0].individual).toBe(individual);
        });
    });

    // Children resolve at depth 0, and hydrate() only registers an entity in the session
    // cache from depth 1 up — so depth-0 FK chains need a recursion guard of their own.
    describe("cycles in the children's FK references", () => {
        it("terminates on a dependentOn cycle instead of overflowing the stack", () => {
            const detail = hydrator.hydrate("ChecklistDetail", {uuid: "cd-1"}, {depth: 0});

            const items = detail.items;

            expect(items.map(i => i.uuid)).toEqual(["cid-1"]);
            expect(items[0].dependentOn.uuid).toBe("cid-2");
            expect(items[0].dependentOn.dependentOn.uuid).toBe("cid-1");
        });
    });

    describe("the parent seeded into the getter's session", () => {
        it("does not displace a deeper hydration already cached by an open session", () => {
            hydrator.beginHydrationSession();
            try {
                const alreadyCached = {uuid: GROUP_UUID, firstName: "Phulwari", encounters: ["deep"]};
                hydrator._hydrationCache.set(`Individual:${GROUP_UUID}`, alreadyCached);

                const individual = hydrator.hydrate("Individual", {uuid: GROUP_UUID, first_name: "Phulwari"}, {depth: 0});
                individual.encounters;

                expect(hydrator._hydrationCache.get(`Individual:${GROUP_UUID}`)).toBe(alreadyCached);
            } finally {
                hydrator.endHydrationSession();
            }
        });
    });

    describe("a failed resolution", () => {
        it("propagates the error and lets the next read try again, rather than latching undefined", () => {
            const individual = hydrator.hydrate("Individual", {uuid: GROUP_UUID, first_name: "Phulwari"}, {depth: 0});
            executeQuery.mockImplementationOnce(() => { throw new Error("database is locked"); });

            expect(() => individual.encounters).toThrow(/database is locked/);
            expect(individual.encounters.map(e => e.uuid)).toEqual(["enc-0", "enc-1", "enc-2"]);
        });
    });

    function groupSubjectQueryCount() {
        return queryCount("group_subject");
    }

    // Matches the table name as a whole word, so counting "encounter" doesn't also
    // count a query against encounter_type.
    function queryCount(tableName) {
        return executeQuery.mock.calls.filter(([sql]) => sql.includes(`FROM ${tableName} `)).length;
    }
});
