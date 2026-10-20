import {openSeededDb} from "./lazyFixture";

const visit = (fields = {}) => ({
    uuid: "enc-new", encounterType: {uuid: "et-visit"}, individual: {uuid: "ind-2"},
    encounterDateTime: new Date("2026-09-03T10:00:00.000Z"), voided: false, observations: [], cancelObservations: [], ...fields,
});

describe("Writing rows that are already in table shape", () => {
    it("stores them exactly as bulkCreate stores the same entities", async () => {
        const viaEntities = openSeededDb();
        const viaRows = openSeededDb();

        await viaEntities.proxy.bulkCreate("Encounter", [visit()]);
        await viaRows.proxy.bulkInsertRows("Encounter", [viaRows.hydrator.flatten("Encounter", visit())]);

        expect(viaEntities.rowsOf("encounter").some((row) => row.uuid === "enc-new")).toBe(true);
        expect(viaRows.rowsOf("encounter").some((row) => row.uuid === "enc-new")).toBe(true);
        expect(viaRows.rowsOf("encounter")).toEqual(viaEntities.rowsOf("encounter"));
        viaEntities.rawDb.close();
        viaRows.rawDb.close();
    });

    it("updates only the columns a row carries, so a link the phone keeps survives", async () => {
        const {proxy, hydrator, rowsOf, rawDb} = openSeededDb([["Encounter", {uuid: "enc-1a", name: "First visit"}]]);
        const before = rowsOf("encounter").find((row) => row.uuid === "enc-1a");
        expect(before.name).toBe("First visit");
        expect(before.latest_entity_approval_status_uuid).toBe("eas-1a");

        await proxy.bulkInsertRows("Encounter", [hydrator.flatten("Encounter", visit({uuid: "enc-1a", individual: {uuid: "ind-1"}, name: null}))]);

        const after = rowsOf("encounter").find((row) => row.uuid === "enc-1a");
        expect(after.encounter_date_time).toBe(new Date("2026-09-03T10:00:00.000Z").getTime());
        expect(after.name).toBeNull();
        expect(after.latest_entity_approval_status_uuid).toBe("eas-1a");
        rawDb.close();
    });

    it("writes a plain INSERT to a table with no primary key, never ON CONFLICT (INV-011)", async () => {
        const {proxy, rowsOf, rawDb} = openSeededDb();
        const executeBatch = jest.spyOn(rawDb, "executeBatch");

        await proxy.bulkInsertRows("BeneficiaryModePin", [{pin: 1234}, {pin: 1234}]);

        const commands = executeBatch.mock.calls[0][0];
        expect(commands[0][0]).toBe('INSERT INTO beneficiary_mode_pin ("pin") VALUES (?)');
        expect(rowsOf("beneficiary_mode_pin")).toHaveLength(2);
        executeBatch.mockRestore();
        rawDb.close();
    });

    it("does nothing for an empty page", async () => {
        const {proxy, rowsOf, rawDb} = openSeededDb();
        const before = rowsOf("encounter").length;

        await proxy.bulkInsertRows("Encounter", []);

        expect(rowsOf("encounter")).toHaveLength(before);
        rawDb.close();
    });
});

describe("Reading whether foreign keys are enforced", () => {
    it("reads true after they are turned on and false after they are turned off", () => {
        const {proxy, rawDb} = openSeededDb();
        expect(proxy.foreignKeysEnabled()).toBe(false);

        proxy._executeRaw("PRAGMA foreign_keys = ON");
        expect(proxy.foreignKeysEnabled()).toBe(true);

        proxy._executeRaw("PRAGMA foreign_keys = OFF");
        expect(proxy.foreignKeysEnabled()).toBe(false);
        rawDb.close();
    });
});
