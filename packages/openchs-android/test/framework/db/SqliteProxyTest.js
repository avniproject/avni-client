import SqliteProxy from "../../../src/framework/db/SqliteProxy";

// Builds a minimal proxy instance: only tableMetaMap and _executeRaw matter here.
function createProxy() {
    const proxy = Object.create(SqliteProxy.prototype);
    const linkColumn = {name: "latest_entity_approval_status_uuid"};
    proxy.tableMetaMap = new Map([
        ["Individual", {tableName: "individual", getColumn: name => name === "latest_entity_approval_status_uuid" ? linkColumn : undefined}],
        ["Checklist", {tableName: "checklist", getColumn: () => undefined}],
    ]);
    proxy._executeRaw = jest.fn();
    return proxy;
}

describe("SqliteProxy.recomputeLatestEntityApprovalStatus", () => {
    it("derives the link from the latest status_date_time in entity_approval_status", () => {
        const proxy = createProxy();
        proxy.recomputeLatestEntityApprovalStatus("Individual", ["i1", "i2"]);

        expect(proxy._executeRaw).toHaveBeenCalledTimes(1);
        const [sql, params] = proxy._executeRaw.mock.calls[0];
        expect(sql).toContain("UPDATE individual SET latest_entity_approval_status_uuid");
        expect(sql).toContain("SELECT uuid FROM entity_approval_status");
        expect(sql).toContain("WHERE entity_uuid = individual.uuid");
        expect(sql).toContain("ORDER BY status_date_time DESC LIMIT 1");
        expect(params).toEqual(["i1", "i2"]);
        expect(sql.match(/\?/g)).toHaveLength(2);
    });

    it("chunks large uuid lists into multiple statements", () => {
        const proxy = createProxy();
        const uuids = Array.from({length: 501}, (_, i) => `u${i}`);
        proxy.recomputeLatestEntityApprovalStatus("Individual", uuids);

        expect(proxy._executeRaw).toHaveBeenCalledTimes(2);
        expect(proxy._executeRaw.mock.calls[0][1]).toHaveLength(500);
        expect(proxy._executeRaw.mock.calls[1][1]).toEqual(["u500"]);
    });

    it("no-ops for an empty uuid list", () => {
        const proxy = createProxy();
        proxy.recomputeLatestEntityApprovalStatus("Individual", []);
        expect(proxy._executeRaw).not.toHaveBeenCalled();
    });

    it("no-ops for a parent table without the link column", () => {
        const proxy = createProxy();
        proxy.recomputeLatestEntityApprovalStatus("Checklist", ["c1"]);
        expect(proxy._executeRaw).not.toHaveBeenCalled();
    });

    it("throws for an unknown schema", () => {
        const proxy = createProxy();
        expect(() => proxy.recomputeLatestEntityApprovalStatus("NoSuchSchema", ["x"])).toThrow(/No table metadata/);
    });
});
