import EntityHydrator from "../../../src/framework/db/EntityHydrator";

// A caller that asks for shallow hydration means it for the whole graph it pulls, not just the
// row it names. resolveReference used to hydrate every referenced entity with skipLists: false,
// so a subject list asking for shallow encounters still eagerly expanded each enrolment's
// encounters and each subject's enrolments — the bulk of the per-row cost. (avni-client#2105)
describe("EntityHydrator shallow hydration propagation", () => {
    const realmSchemaMap = new Map();
    realmSchemaMap.set("ProgramEncounter", {
        name: "ProgramEncounter",
        primaryKey: "uuid",
        properties: {
            uuid: "string",
            name: "string",
            programEnrolment: {type: "object", objectType: "ProgramEnrolment"},
            encounterType: {type: "object", objectType: "EncounterType"},
            voided: {type: "bool", default: false}
        }
    });
    realmSchemaMap.set("ProgramEnrolment", {
        name: "ProgramEnrolment",
        primaryKey: "uuid",
        properties: {
            uuid: "string",
            individual: {type: "object", objectType: "Individual"},
            program: {type: "object", objectType: "Program"},
            encounters: {type: "list", objectType: "ProgramEncounter"},
            voided: {type: "bool", default: false}
        }
    });
    realmSchemaMap.set("Individual", {
        name: "Individual",
        primaryKey: "uuid",
        properties: {
            uuid: "string",
            firstName: "string",
            enrolments: {type: "list", objectType: "ProgramEnrolment"},
            encounters: {type: "list", objectType: "Encounter"},
            voided: {type: "bool", default: false}
        }
    });
    realmSchemaMap.set("Encounter", {
        name: "Encounter",
        primaryKey: "uuid",
        properties: {
            uuid: "string",
            individual: {type: "object", objectType: "Individual"},
            voided: {type: "bool", default: false}
        }
    });
    realmSchemaMap.set("EncounterType", {
        name: "EncounterType",
        primaryKey: "uuid",
        properties: {uuid: "string", name: "string"}
    });
    realmSchemaMap.set("Program", {
        name: "Program",
        primaryKey: "uuid",
        properties: {uuid: "string", name: "string"}
    });

    const tableMetaMap = new Map();
    tableMetaMap.set("ProgramEncounter", {tableName: "program_encounter", getColumn: () => undefined});
    tableMetaMap.set("ProgramEnrolment", {tableName: "program_enrolment", getColumn: () => undefined});
    tableMetaMap.set("Individual", {tableName: "individual", getColumn: () => undefined});
    tableMetaMap.set("Encounter", {tableName: "encounter", getColumn: () => undefined});
    tableMetaMap.set("EncounterType", {tableName: "encounter_type", getColumn: () => undefined});
    tableMetaMap.set("Program", {tableName: "program", getColumn: () => undefined});

    const ENROLMENT_UUID = "enl-1";
    const INDIVIDUAL_UUID = "ind-1";

    // The row the subject list starts from, and the graph it walks: encounter -> enrolment ->
    // individual. Each of the two lists below is one the screen never displays.
    const programEncounterRow = {
        uuid: "penc-1",
        name: "ANC 1",
        program_enrolment_uuid: ENROLMENT_UUID,
        encounter_type_uuid: "et-1",
        voided: 0
    };

    const siblingEncounterRows = [
        {uuid: "penc-2", name: "ANC 2", program_enrolment_uuid: ENROLMENT_UUID, encounter_type_uuid: "et-1", voided: 0},
        {uuid: "penc-3", name: "ANC 3", program_enrolment_uuid: ENROLMENT_UUID, encounter_type_uuid: "et-1", voided: 0}
    ];
    const enrolmentRows = [
        {uuid: ENROLMENT_UUID, individual_uuid: INDIVIDUAL_UUID, program_uuid: "prg-1", voided: 0},
        {uuid: "enl-2", individual_uuid: INDIVIDUAL_UUID, program_uuid: "prg-2", voided: 0}
    ];
    const generalEncounterRows = [
        {uuid: "genc-1", individual_uuid: INDIVIDUAL_UUID, voided: 0}
    ];

    function queryFor(sql, params) {
        if (sql.includes("FROM program_enrolment") && sql.includes('"uuid" =')) return [enrolmentRows[0]];
        if (sql.includes("FROM individual") && sql.includes('"uuid" =')) return [{uuid: INDIVIDUAL_UUID, first_name: "Kavita"}];
        if (sql.includes("FROM encounter_type")) return [{uuid: "et-1", name: "ANC"}];
        if (sql.includes("FROM program") && sql.includes('"uuid" =')) return [{uuid: "prg-1", name: "Mother"}];
        if (sql.includes("FROM program_encounter") && sql.includes("program_enrolment_uuid")) return siblingEncounterRows;
        if (sql.includes("FROM program_enrolment") && sql.includes("individual_uuid")) return enrolmentRows;
        if (sql.includes("FROM encounter") && sql.includes("individual_uuid")) return generalEncounterRows;
        return [];
    }

    let hydrator;
    let executeQuery;

    beforeEach(() => {
        executeQuery = jest.fn(queryFor);
        hydrator = new EntityHydrator(tableMetaMap, realmSchemaMap, executeQuery, {});
    });

    function listQueryCount(table, fkColumn) {
        return executeQuery.mock.calls
            .filter(([sql]) => sql.includes(`FROM ${table}`) && sql.includes(fkColumn))
            .length;
    }

    const enrolmentEncountersQueries = () => listQueryCount("program_encounter", "program_enrolment_uuid");
    const individualEnrolmentsQueries = () => listQueryCount("program_enrolment", "individual_uuid");
    const individualEncountersQueries = () => listQueryCount("encounter", "individual_uuid");

    describe("skipLists reaches referenced entities", () => {
        it("does not expand a referenced enrolment's encounters", () => {
            hydrator.hydrate("ProgramEncounter", programEncounterRow, {skipLists: true, depth: 2});

            expect(enrolmentEncountersQueries()).toBe(0);
        });

        it("does not expand a referenced subject's lists", () => {
            hydrator.hydrate("ProgramEncounter", programEncounterRow, {skipLists: true, depth: 3});

            expect(individualEnrolmentsQueries()).toBe(0);
            expect(individualEncountersQueries()).toBe(0);
        });

        it("still resolves the references the row displays", () => {
            const encounter = hydrator.hydrate("ProgramEncounter", programEncounterRow, {skipLists: true, depth: 2});

            expect(encounter.programEnrolment.individual.firstName).toEqual("Kavita");
            expect(encounter.encounterType.name).toEqual("ANC");
        });

        it("defers a skipped list rather than reporting it empty", () => {
            const encounter = hydrator.hydrate("ProgramEncounter", programEncounterRow, {skipLists: true, depth: 2});

            expect(encounter.programEnrolment.encounters.map(e => e.uuid)).toEqual(["penc-2", "penc-3"]);
        });

        it("leaves eager hydration untouched when the caller does not ask to skip lists", () => {
            hydrator.hydrate("ProgramEncounter", programEncounterRow, {depth: 2});

            expect(enrolmentEncountersQueries()).toBe(1);
        });
    });

    describe("listsToInclude is scoped to the schema that owns the list", () => {
        it("keeps a named list eager on its own schema", () => {
            const encounter = hydrator.hydrate("ProgramEncounter", programEncounterRow, {
                skipLists: true,
                depth: 3,
                listsToInclude: new Set(["Individual.enrolments"])
            });

            expect(individualEnrolmentsQueries()).toBe(1);
            expect(encounter.programEnrolment.individual.enrolments.map(e => e.uuid)).toEqual([ENROLMENT_UUID, "enl-2"]);
        });

        // Individual.encounters and ProgramEnrolment.encounters share a property name. A bare
        // "encounters" key would keep the enrolment's whole encounter history eager — the single
        // most expensive read on this path, and the one this card exists to remove.
        it("does not match a same-named list on a different schema", () => {
            hydrator.hydrate("ProgramEncounter", programEncounterRow, {
                skipLists: true,
                depth: 3,
                listsToInclude: new Set(["Individual.encounters"])
            });

            expect(individualEncountersQueries()).toBe(1);
            expect(enrolmentEncountersQueries()).toBe(0);
        });
    });
});
