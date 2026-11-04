import {CustomFilter, ReportCard} from "openchs-models";
import CustomCardCommandService, {COMMANDS} from "../../../src/service/customDashboard/CustomCardCommandService";
import CustomDashboardService from "../../../src/service/customDashboard/CustomDashboardService";
import DashboardFilterService from "../../../src/service/reports/DashboardFilterService";
import AddressLevelService from "../../../src/service/AddressLevelService";
import AddressFilterValue from "../../../src/model/AddressFilterValue";
import General from "../../../src/utility/General";

describe("CustomCardCommandService", () => {
    const service = new CustomCardCommandService({}, {});
    const page = {view: {}, reportCard: {}};

    it("ignores a command it does not know", () => {
        // Other modules spread their commands into the same map, so only this one's is checked for.
        expect(Object.keys(COMMANDS)).toEqual(expect.arrayContaining(["runCardAction"]));
        ["notACommand", "toString", "constructor", "__proto__", "hasOwnProperty"].forEach((name) => {
            expect(service.dispatch({avniCommand: name, args: {}}, page)).toBe(false);
        });
    });

    it("runs a known command with the service, its args and the page", () => {
        const handler = jest.fn();
        expect(service.dispatch({avniCommand: "ping", args: {a: 1}}, page, {ping: handler})).toBe(true);
        expect(handler).toHaveBeenCalledWith(service, {a: 1}, page);
    });

    it("passes {} for args that are not a plain object", () => {
        const handler = jest.fn();
        [undefined, null, "x", 5, [1], true].forEach((args) => {
            handler.mockClear();
            service.dispatch({avniCommand: "ping", args}, page, {ping: handler});
            expect(handler).toHaveBeenCalledWith(service, {}, page);
        });
    });

    describe("runCardAction", () => {
        const TARGET = "11111111-1111-1111-1111-111111111111";
        const LOCATION = "22222222-2222-2222-2222-222222222222";

        // The card page's openDashboard runs beforeOpen and opens the target only while no other command is opening a screen.
        const setup = (options = {}) => {
            // An option given as undefined stays undefined, which a destructuring default would replace.
            const option = (name, fallback) => (name in options ? options[name] : fallback);
            const action = option("action", ReportCard.actionTypes.OpenDashboard);
            const target = option("target", TARGET);
            const visible = option("visible", [TARGET]);
            const filters = option("filters", {});
            const locations = option("locations", {[LOCATION]: {uuid: LOCATION, voided: false}});
            const sourceDashboardUUID = option("sourceDashboardUUID", "source-uuid");
            const order = [];
            const customDashboardService = {
                getDashboards: jest.fn(() => visible.map((uuid) => ({uuid}))),
                carryFiltersOver: jest.fn(() => order.push("carry")),
            };
            const dashboardFilterService = {getFilterConfigsForDashboard: jest.fn(() => filters)};
            // The real walk up the hierarchy, over these locations instead of the database.
            const addressLevelService = new AddressLevelService(null, null);
            addressLevelService.findByUUID = jest.fn((uuid) => locations[uuid]);
            addressLevelService.getParent = (uuid) => (locations[uuid] ? [locations[uuid]] : []);
            const services = new Map([
                [CustomDashboardService.name, customDashboardService],
                [DashboardFilterService.name, dashboardFilterService],
                [AddressLevelService.name, addressLevelService],
            ]);
            const commandService = new CustomCardCommandService({}, {});
            commandService.getService = (klass) => services.get(klass.name);
            let opening = false;
            const page = {
                reportCard: {action, isActionOpenDashboard() { return this.action === ReportCard.actionTypes.OpenDashboard; }, actionDetailDashboardUUID: target},
                sourceDashboardUUID,
                showMessage: jest.fn((key) => order.push("message:" + key)),
                openDashboard: jest.fn((t, beforeOpen) => {
                    if (opening) return false;
                    opening = true;
                    beforeOpen();
                    order.push("open:" + t);
                    return true;
                }),
            };
            const run = (args) => COMMANDS.runCardAction(commandService, args, page);
            return {run, page, order, customDashboardService, dashboardFilterService, addressLevelService};
        };
        const nothingHappened = ({page, customDashboardService}) => {
            expect(customDashboardService.carryFiltersOver).not.toHaveBeenCalled();
            expect(page.openDashboard).not.toHaveBeenCalled();
        };

        it("ignores the link on a card whose action is not Open dashboard", () => {
            [null, undefined, ReportCard.actionTypes.DoVisit, ReportCard.actionTypes.ViewSubjectProfile, ReportCard.actionTypes.MarkAttendance].forEach((action) => {
                const t = setup({action});
                t.run({locationUUID: LOCATION});
                nothingHappened(t);
                expect(t.page.showMessage).not.toHaveBeenCalled();
                expect(t.customDashboardService.getDashboards).not.toHaveBeenCalled();
            });
        });

        it("shows not available for a target the user cannot see, and for no target", () => {
            [setup({visible: []}), setup({target: null}), setup({target: undefined}), setup({target: ""})].forEach((t) => {
                t.run({locationUUID: LOCATION});
                expect(t.order).toEqual(["message:dashboardNotAvailableToUser"]);
                nothingHappened(t);
            });
        });

        it("checks the target before the location", () => {
            const t = setup({visible: []});
            t.run({locationUUID: "not a uuid"});
            expect(t.order).toEqual(["message:dashboardNotAvailableToUser"]);
            expect(t.addressLevelService.findByUUID).not.toHaveBeenCalled();
        });

        it("shows not on this phone for a missing or unusable location, and does not look up a value that is not a uuid", () => {
            const notUuids = [undefined, null, "", 5, {}, ["x"], "abc", "it's", "' OR 1=1 --", "two words", ` ${LOCATION}`, `${LOCATION}\n`, LOCATION + "'", "2222222222222222222222222222222222222"];
            notUuids.forEach((locationUUID) => {
                const t = setup();
                t.run({locationUUID});
                expect(t.order).toEqual(["message:recordNotOnThisPhone"]);
                nothingHappened(t);
                expect(t.addressLevelService.findByUUID).not.toHaveBeenCalled();
            });
            const noArgs = setup();
            noArgs.run(undefined);
            expect(noArgs.order).toEqual(["message:recordNotOnThisPhone"]);
            [setup({locations: {}}), setup({locations: {[LOCATION]: {uuid: LOCATION, voided: true}}}), setup({locations: {[LOCATION]: null}})].forEach((t) => {
                t.run({locationUUID: LOCATION});
                expect(t.order).toEqual(["message:recordNotOnThisPhone"]);
                nothingHappened(t);
                expect(t.addressLevelService.findByUUID).toHaveBeenCalledWith(LOCATION);
            });
        });

        // Debug lines can reach Bugsnag as breadcrumbs on a release build, and a page that passes the wrong field could
        // send a name.
        it("the not on this phone debug line writes the location only when it is shaped like an id", () => {
            const logDebug = jest.spyOn(General, "logDebug").mockImplementation(() => {});
            const logged = () => logDebug.mock.calls.flat().map(String);
            ["Asha Devi", "it's", "' OR 1=1 --", ` ${LOCATION}`, LOCATION + "'", "2222222222222222222222222222222222222"].forEach((locationUUID) => {
                logDebug.mockClear();
                const t = setup();
                t.run({locationUUID});
                expect(t.order).toEqual(["message:recordNotOnThisPhone"]);
                expect(logDebug).toHaveBeenCalled();
                expect(logged().filter((arg) => arg.includes(locationUUID))).toEqual([]);
            });
            logDebug.mockClear();
            setup().run({locationUUID: "Asha Devi"});
            expect(logged().join("\n")).toContain("a string of 9 characters, not an id");
            logDebug.mockClear();
            setup().run({locationUUID: 5});
            expect(logged().join("\n")).toContain("a value of type number, not an id");

            logDebug.mockClear();
            setup({locations: {}}).run({locationUUID: LOCATION});
            expect(logged().filter((arg) => arg.includes(LOCATION))).toHaveLength(1);
            logDebug.mockRestore();
        });

        const FILTERS = {
            "loc-1": {type: CustomFilter.type.Address},
            "date-1": {type: CustomFilter.type.RegistrationDate},
            "loc-2": {type: CustomFilter.type.Address},
        };
        // The link's location two levels below the top: a district, its PHC, then the sub centre.
        const DISTRICT = {uuid: "33333333-3333-3333-3333-333333333333", name: "Hassan", level: 3, typeUuid: "district-type", voided: false};
        const PHC = {uuid: "44444444-4444-4444-4444-444444444444", name: "PHC Konasale", level: 2, typeUuid: "phc-type", parentUuid: DISTRICT.uuid, voided: false};
        const SUB_CENTRE = {uuid: LOCATION, name: "Sub Centre - Konasale", level: 1, typeUuid: "sub-centre-type", parentUuid: PHC.uuid, voided: false};
        const HIERARCHY = {[DISTRICT.uuid]: DISTRICT, [PHC.uuid]: PHC, [LOCATION]: SUB_CENTRE};

        // As a choice on the Filter screen is stored, so that screen shows the location as chosen.
        it("carries the link's location with its parents, from the top level down, on every location filter of the target", () => {
            const t = setup({filters: FILTERS, locations: HIERARCHY});
            t.run({locationUUID: LOCATION});
            expect(t.dashboardFilterService.getFilterConfigsForDashboard).toHaveBeenCalledWith(TARGET);
            expect(t.customDashboardService.carryFiltersOver).toHaveBeenCalledTimes(1);
            const [source, target, overrides] = t.customDashboardService.carryFiltersOver.mock.calls[0];
            expect([source, target]).toEqual(["source-uuid", TARGET]);
            expect(Object.keys(overrides).sort()).toEqual(["loc-1", "loc-2"]);
            ["loc-1", "loc-2"].forEach((uuid) => {
                expect(overrides[uuid]).toBeInstanceOf(AddressFilterValue);
                expect(overrides[uuid]).toEqual(new AddressFilterValue([DISTRICT, PHC, SUB_CENTRE], []));
            });
            expect(t.order).toEqual(["carry", "open:" + TARGET]);
        });

        it("carries a location at the top level alone", () => {
            const t = setup({filters: FILTERS});
            t.run({locationUUID: LOCATION});
            const overrides = t.customDashboardService.carryFiltersOver.mock.calls[0][2];
            ["loc-1", "loc-2"].forEach((uuid) => {
                expect(overrides[uuid]).toEqual(new AddressFilterValue([{uuid: LOCATION, voided: false}], []));
            });
        });

        it("carries inside the opening, before the target opens", () => {
            const t = setup({filters: FILTERS});
            t.page.openDashboard = jest.fn();
            t.run({locationUUID: LOCATION});
            expect(t.page.openDashboard).toHaveBeenCalledWith(TARGET, expect.any(Function));
            expect(t.customDashboardService.carryFiltersOver).not.toHaveBeenCalled();
            t.page.openDashboard.mock.calls[0][1]();
            expect(t.customDashboardService.carryFiltersOver).toHaveBeenCalledTimes(1);
        });

        it("opens a target with no location filter, with the location dropped", () => {
            const t = setup({filters: {"date-1": {type: CustomFilter.type.RegistrationDate}}});
            t.run({locationUUID: LOCATION});
            expect(t.customDashboardService.carryFiltersOver).toHaveBeenCalledWith("source-uuid", TARGET, {});
            expect(t.order).toEqual(["carry", "open:" + TARGET]);
            expect(t.page.showMessage).not.toHaveBeenCalled();
        });

        it("with no source dashboard, the location still applies", () => {
            [undefined, null, ""].forEach((sourceDashboardUUID) => {
                const t = setup({filters: FILTERS, sourceDashboardUUID});
                t.run({locationUUID: LOCATION});
                const [source, target, overrides] = t.customDashboardService.carryFiltersOver.mock.calls[0];
                expect([source, target]).toEqual([TARGET, TARGET]);
                expect(Object.keys(overrides).sort()).toEqual(["loc-1", "loc-2"]);
            });
        });

        it("the page cannot name the dashboard", () => {
            const t = setup({target: "d-target", visible: ["d-target"], filters: FILTERS});
            t.run({locationUUID: LOCATION, dashboardUUID: "d-other", targetDashboardUUID: "d-other"});
            expect(t.customDashboardService.getDashboards).toHaveBeenCalled();
            expect(t.dashboardFilterService.getFilterConfigsForDashboard).toHaveBeenCalledWith("d-target");
            expect(t.customDashboardService.carryFiltersOver.mock.calls[0].slice(0, 2)).toEqual(["source-uuid", "d-target"]);
            expect(t.order).toEqual(["carry", "open:d-target"]);
            expect(JSON.stringify([t.page.openDashboard.mock.calls, t.dashboardFilterService.getFilterConfigsForDashboard.mock.calls])).not.toContain("d-other");
        });

        it("a second link dropped while the first one opens changes no filters", () => {
            const t = setup({filters: FILTERS});
            t.run({locationUUID: LOCATION});
            t.run({locationUUID: LOCATION});
            expect(t.page.openDashboard).toHaveBeenCalledTimes(2);
            expect(t.customDashboardService.carryFiltersOver).toHaveBeenCalledTimes(1);
            expect(t.order).toEqual(["carry", "open:" + TARGET]);
        });
    });
});
