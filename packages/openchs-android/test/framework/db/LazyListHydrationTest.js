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
            voided: {type: "bool", default: false}
        }
    });
    realmSchemaMap.set("Individual", {
        name: "Individual",
        primaryKey: "uuid",
        properties: {
            uuid: "string",
            firstName: "string",
            groupSubjects: {type: "list", objectType: "GroupSubject"}
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

    const tableMetaMap = new Map();
    tableMetaMap.set("Encounter", {tableName: "encounter", getColumn: () => undefined});
    tableMetaMap.set("Individual", {tableName: "individual", getColumn: () => undefined});
    tableMetaMap.set("GroupSubject", {
        tableName: "group_subject",
        getColumn: (n) => (n === "group_subject_uuid" || n === "member_subject_uuid") ? {} : undefined
    });

    const GROUP_UUID = "phulwari-uuid";
    const memberRows = _memberRows(5);

    function _memberRows(count) {
        return Array.from({length: count}, (_x, i) => ({
            uuid: `gs-${i}`,
            group_subject_uuid: GROUP_UUID,
            member_subject_uuid: `child-${i}`,
            voided: 0
        }));
    }

    // Answers the queries the hydrator makes: the group's Individual row, and the
    // GroupSubject rows pointing back at it.
    function queryFor(sql, params) {
        if (sql.includes("FROM individual") && params[0] === GROUP_UUID)
            return [{uuid: GROUP_UUID, first_name: "Phulwari"}];
        if (sql.includes("FROM group_subject") && params[0] === GROUP_UUID)
            return memberRows;
        return [];
    }

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

    it("returns an empty list without querying while shallow mode is on", () => {
        hydrator.setShallowMode(true);

        const encounter = hydrator.hydrate("Encounter", encounterRow, {depth: 1});
        const groupSubjectQueriesBefore = groupSubjectQueryCount();
        const members = encounter.individual.groupSubjects;

        expect(members).toEqual([]);
        expect(groupSubjectQueryCount()).toBe(groupSubjectQueriesBefore);
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

    function groupSubjectQueryCount() {
        return executeQuery.mock.calls.filter(([sql]) => sql.includes("FROM group_subject")).length;
    }
});
