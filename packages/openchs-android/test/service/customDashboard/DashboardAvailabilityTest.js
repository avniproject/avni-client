// The check a tile and a Custom Design Card's page share: can this user see that dashboard.
import {isDashboardAvailableToUser, CustomDashboardType} from "../../../src/service/customDashboard/CustomDashboardService";

describe("isDashboardAvailableToUser", () => {
    const getDashboards = jest.fn((type) => [{uuid: "d-1"}, {uuid: "d-2"}]);
    const service = {getDashboards};

    it("is true only for a uuid among the dashboards the user can see, asked for with no type", () => {
        expect(isDashboardAvailableToUser(service, "d-2")).toBe(true);
        expect(getDashboards).toHaveBeenCalledWith(CustomDashboardType.None);
        expect(isDashboardAvailableToUser(service, "d-3")).toBe(false);
    });

    it("is false for a nil or empty uuid, even when a dashboard has no uuid", () => {
        const odd = {getDashboards: () => [{}, {uuid: null}, {uuid: undefined}, null]};
        [undefined, null].forEach((uuid) => expect(isDashboardAvailableToUser(odd, uuid)).toBe(false));
        expect(isDashboardAvailableToUser(service, "")).toBe(false);
    });
});
