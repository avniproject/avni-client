// Verifies CustomDashboardActions.onLoad.
// It loads dashboards by type as it always did. Asked for one dashboard, it loads that one alone.
// It brings back a chosen tab when that tab is in the loaded list. And it records in `ownerKey`
// which screen the shared dashboard state belongs to, even when nothing was loaded.

import {assert} from "chai";

jest.mock("../../../src/framework/bean/Service", () => () => (target) => target);

import {CustomDashboardActions, dashboardOwnerKey} from "../../../src/action/customDashboard/CustomDashboardActions";
import CustomDashboardService from "../../../src/service/customDashboard/CustomDashboardService";
import DashboardFilterService from "../../../src/service/reports/DashboardFilterService";
import DashboardSectionCardMappingService from "../../../src/service/customDashboard/DashboardSectionCardMappingService";

function makeContext(stubs) {
    const map = new Map(stubs.map(([klass, stub]) => [klass.name, stub]));
    return {get: (klass) => map.get(klass.name)};
}

// Built per test, so a call recorded in one test never shows up in the next.
function makeDashboardService() {
    return {
        getDashboards: jest.fn(),
        findByUUID: jest.fn(),
        getDashboardData: () => ({selectedFilterValues: {}, dashboardCache: {filterApplied: false}}),
    };
}

function load(dashboardService, action) {
    const context = makeContext([
        [CustomDashboardService, dashboardService],
        [DashboardFilterService, {areFiltersPresent: () => false}],
        [DashboardSectionCardMappingService, {getAllCardsForDashboard: () => []}],
    ]);
    return CustomDashboardActions.onLoad(CustomDashboardActions.getInitialState(), action, context);
}

const d1 = {uuid: "d1", voided: false};
const d2 = {uuid: "d2", voided: false};
const d3 = {uuid: "d3", voided: false};

describe("CustomDashboardActions.onLoad", () => {
    it("loads only the requested dashboard and makes it active", () => {
        const service = makeDashboardService();
        service.findByUUID.mockReturnValue(d2);

        const newState = load(service, {dashboardUUID: "d2"});

        assert.deepEqual(service.findByUUID.mock.calls, [["d2"]]);
        assert.equal(service.getDashboards.mock.calls.length, 0);
        assert.deepEqual(newState.dashboards, [d2]);
        assert.equal(newState.activeDashboardUUID, "d2");
        assert.equal(newState.ownerKey, "None|d2");
    });

    it("loads nothing when the requested dashboard is missing or voided", () => {
        // The phone database returns null for a record it cannot find, so null is a missing case too.
        [undefined, null, {uuid: "d2", voided: true}].forEach(found => {
            const service = makeDashboardService();
            service.findByUUID.mockReturnValue(found);

            const newState = load(service, {dashboardUUID: "d2"});

            const when = `when findByUUID gives ${JSON.stringify(found)}`;
            assert.deepEqual(newState.dashboards, [], `dashboards ${when}`);
            assert.equal(newState.ownerKey, "None|d2", `ownerKey ${when}`);
            assert.equal(service.getDashboards.mock.calls.length, 0, `no fall back to a list ${when}`);
        });
    });

    it("loads by type as today without a requested dashboard", () => {
        const service = makeDashboardService();
        service.getDashboards.mockReturnValue([d1]);

        const newState = load(service, {customDashboardType: "Primary"});

        assert.deepEqual(service.getDashboards.mock.calls, [["Primary"]]);
        assert.equal(service.findByUUID.mock.calls.length, 0);
        assert.deepEqual(newState.dashboards, [d1]);
        assert.equal(newState.activeDashboardUUID, "d1");
        assert.equal(newState.ownerKey, "Primary|");
    });

    it("loads by type when the requested dashboard is an empty string", () => {
        const service = makeDashboardService();
        service.getDashboards.mockReturnValue([d1, d2]);

        const newState = load(service, {customDashboardType: "Primary", dashboardUUID: ""});

        assert.deepEqual(service.getDashboards.mock.calls, [["Primary"]]);
        assert.equal(service.findByUUID.mock.calls.length, 0);
        assert.equal(newState.activeDashboardUUID, "d1");
        assert.equal(newState.ownerKey, "Primary|");
        assert.equal(dashboardOwnerKey("Primary", ""), "Primary|");
    });

    it("restores the requested tab when it is in the list", () => {
        const service = makeDashboardService();
        service.getDashboards.mockReturnValue([d1, d2, d3]);

        assert.equal(load(service, {activeDashboardUUID: "d2"}).activeDashboardUUID, "d2");
        assert.equal(load(service, {activeDashboardUUID: "dX"}).activeDashboardUUID, "d1");
    });

    it("starts with no owner key", () => {
        assert.isNull(CustomDashboardActions.getInitialState().ownerKey);
    });
});

describe("dashboardOwnerKey", () => {
    it("owner key treats a missing type as None", () => {
        assert.equal(dashboardOwnerKey(undefined, undefined), "None|");
        assert.equal(dashboardOwnerKey("None", null), "None|");
        assert.equal(dashboardOwnerKey(undefined, undefined), dashboardOwnerKey("None", null));
    });

    it("owner key joins the type and the requested dashboard", () => {
        assert.equal(dashboardOwnerKey("Primary"), "Primary|");
        assert.equal(dashboardOwnerKey("Secondary"), "Secondary|");
        assert.equal(dashboardOwnerKey("None", "d2"), "None|d2");
        assert.equal(dashboardOwnerKey(undefined, "d2"), "None|d2");
    });
});
