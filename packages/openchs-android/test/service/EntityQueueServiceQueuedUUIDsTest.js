import {EntityQueue} from "openchs-models";
import EntityQueueService from "../../src/service/EntityQueueService";

// A queue as the database holds it: one row per save, so an entity saved twice has two rows.
function serviceWithQueue(rows) {
    const svc = Object.create(EntityQueueService.prototype);
    const findAll = () => ({filtered: (query, entityName) => rows.filter((row) => row.entity === entityName)});
    Object.defineProperty(svc, "repository", {value: {findAll}});
    return svc;
}

describe("EntityQueueService.getQueuedEntityUUIDs", () => {
    it("names each entity of one type waiting to be pushed once, and nothing of other types", () => {
        const svc = serviceWithQueue([
            {entity: "Individual", entityUUID: "s-1"},
            {entity: "Individual", entityUUID: "s-1"},
            {entity: "Individual", entityUUID: "s-2"},
            {entity: "Encounter", entityUUID: "e-1"},
        ]);
        expect(svc.getQueuedEntityUUIDs("Individual")).toEqual(["s-1", "s-2"]);
        expect(svc.getQueuedEntityUUIDs("ProgramEnrolment")).toEqual([]);
        expect(EntityQueue.schema.name).toBe("EntityQueue");
    });
});
