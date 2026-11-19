// Verifies CustomDashboardActions.onCardPress for a card whose action is Open dashboard.
// When the user can see the target, the filters carry over from the dashboard the tile sits on and the screen is
// asked to open the target. When they cannot, or the card has no target, the screen is asked to say the dashboard
// is not available. No card result is computed, nothing opens the subject dashboard, and a Custom Design Card
// with this action still opens its own page.

import {assert} from "chai";

jest.mock("../../../src/framework/bean/Service", () => () => (target) => target);

import {CustomDashboardActions} from "../../../src/action/customDashboard/CustomDashboardActions";
import CustomDashboardService, {CustomDashboardType} from "../../../src/service/customDashboard/CustomDashboardService";
import ReportCardService from "../../../src/service/customDashboard/ReportCardService";
import EntityService from "../../../src/service/EntityService";
import DashboardFilterService from "../../../src/service/reports/DashboardFilterService";
import {cardPressState, makeAction, makeReportCard} from "./CardPressTestFixture";

function makeContext(stubs) {
    const map = new Map(stubs.map(([klass, stub]) => [klass.name, stub]));
    return {get: (klass) => map.get(klass.name)};
}

// The fixture's buildContext takes no overrides, and its card result is a plain function that cannot be asked
// whether it ran. So this builds its own, with spies for the three calls these tests are about.
// `visibleDashboards` is what the Menu > Dashboards list holds for this user. Built per test, so a call recorded
// in one test never shows up in the next.
function buildOpenDashboardContext(reportCard, visibleDashboards) {
    const spies = {
        getReportCardResult: jest.fn(() => ({result: [], status: null})),
        getDashboards: jest.fn(() => visibleDashboards),
        carryFiltersOver: jest.fn(() => true),
    };
    const context = makeContext([
        [ReportCardService, {getPlainUUIDFromCompositeReportCardUUID: (x) => x, getReportCardResult: spies.getReportCardResult}],
        [EntityService, {findByUUID: () => reportCard}],
        [CustomDashboardService, {
            getDashboardData: () => ({selectedFilterValues: {}}),
            getDashboards: spies.getDashboards,
            carryFiltersOver: spies.carryFiltersOver,
        }],
        [DashboardFilterService, {toRuleInputObjects: () => []}],
    ]);
    return {context, ...spies};
}

function makeOpenDashboardCard(targetDashboardUUID, overrides) {
    return makeReportCard({
        action: "OpenDashboard",
        isActionOpenDashboard: () => true,
        actionDetailDashboardUUID: targetDashboardUUID,
        ...overrides,
    });
}

// The screen callbacks onCardPress can fire, on top of the ones the fixture already provides.
function makeOpenDashboardAction() {
    return {
        ...makeAction(),
        onOpenDashboard: jest.fn(),
        onDashboardNotAvailable: jest.fn(),
        onFullyCustomCardPress: jest.fn(),
    };
}

// Taps the card on dashboard "d1" (the fixture's active dashboard). Timers are not run, so the test decides when.
function tap(reportCard, visibleDashboards) {
    const action = makeOpenDashboardAction();
    const built = buildOpenDashboardContext(reportCard, visibleDashboards);
    CustomDashboardActions.onCardPress(cardPressState, action, built.context);
    return {action, ...built};
}

// This path computes no card result, so it opens no list, and it never routes anything to the subject dashboard.
function assertNoCardResultAndNoSubject({action, getReportCardResult}) {
    assert.equal(getReportCardResult.mock.calls.length, 0);
    assert.equal(action.onCustomRecordCardResults.mock.calls.length, 0);
    assert.equal(action.onShowSubjectAction.mock.calls.length, 0);
}

describe("CustomDashboardActions.onCardPress Open dashboard", () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it("opens a visible target and carries filters from the active dashboard", () => {
        const tapped = tap(makeOpenDashboardCard("t1"), [{uuid: "t1"}]);
        const {action, carryFiltersOver} = tapped;
        // The screen is asked on the next tick, never from inside the action.
        assert.equal(action.onOpenDashboard.mock.calls.length, 0);

        jest.runAllTimers();

        assert.deepEqual(carryFiltersOver.mock.calls, [["d1", "t1"]]);
        assert.deepEqual(action.onOpenDashboard.mock.calls, [["t1"]]);
        assert.equal(action.onDashboardNotAvailable.mock.calls.length, 0);
        // The filters are carried before the screen is asked to open the target.
        assert.isBelow(carryFiltersOver.mock.invocationCallOrder[0], action.onOpenDashboard.mock.invocationCallOrder[0]);
        assertNoCardResultAndNoSubject(tapped);
    });

    it("carries the filters even when the target is the dashboard the tile sits on", () => {
        const tapped = tap(makeOpenDashboardCard("d1"), [{uuid: "d1"}]);

        jest.runAllTimers();

        assert.deepEqual(tapped.carryFiltersOver.mock.calls, [["d1", "d1"]]);
        assert.deepEqual(tapped.action.onOpenDashboard.mock.calls, [["d1"]]);
        assert.equal(tapped.action.onDashboardNotAvailable.mock.calls.length, 0);
    });

    it("opens a visible target that is not the first dashboard in the list", () => {
        // A check that only looked at the first dashboard would miss it.
        const tapped = tap(makeOpenDashboardCard("t1"), [{uuid: "a"}, {uuid: "t1"}, {uuid: "b"}]);

        jest.runAllTimers();

        assert.deepEqual(tapped.carryFiltersOver.mock.calls, [["d1", "t1"]]);
        assert.deepEqual(tapped.action.onOpenDashboard.mock.calls, [["t1"]]);
        assert.equal(tapped.action.onDashboardNotAvailable.mock.calls.length, 0);
        assertNoCardResultAndNoSubject(tapped);
    });

    it("judges visibility against the whole Dashboards menu list, not the primary or secondary dashboard", () => {
        const tapped = tap(makeOpenDashboardCard("t1"), [{uuid: "t1"}]);

        assert.deepEqual(tapped.getDashboards.mock.calls, [[CustomDashboardType.None]]);
    });

    it("shows the message for a target the user cannot see", () => {
        const tapped = tap(makeOpenDashboardCard("t1"), [{uuid: "other"}]);
        const {action, carryFiltersOver} = tapped;
        // The screen is asked on the next tick, never from inside the action.
        assert.equal(action.onDashboardNotAvailable.mock.calls.length, 0);

        jest.runAllTimers();

        assert.equal(action.onDashboardNotAvailable.mock.calls.length, 1);
        assert.equal(action.onOpenDashboard.mock.calls.length, 0);
        assert.equal(carryFiltersOver.mock.calls.length, 0);
        assertNoCardResultAndNoSubject(tapped);
    });

    it("shows the message for a card with no target", () => {
        const tapped = tap(makeOpenDashboardCard(null), [{uuid: "t1"}]);
        const {action, carryFiltersOver} = tapped;

        jest.runAllTimers();

        assert.equal(action.onDashboardNotAvailable.mock.calls.length, 1);
        assert.equal(action.onOpenDashboard.mock.calls.length, 0);
        assert.equal(carryFiltersOver.mock.calls.length, 0);
        assertNoCardResultAndNoSubject(tapped);
    });

    it("shows the message when the user can see no dashboards at all", () => {
        // An empty list holds no dashboard, so no target is visible. A check that asked whether every dashboard
        // matches would say yes to an empty list and open anything.
        const tapped = tap(makeOpenDashboardCard("t1"), []);

        jest.runAllTimers();

        assert.equal(tapped.action.onDashboardNotAvailable.mock.calls.length, 1);
        assert.equal(tapped.action.onOpenDashboard.mock.calls.length, 0);
        assert.equal(tapped.carryFiltersOver.mock.calls.length, 0);
        assertNoCardResultAndNoSubject(tapped);
    });

    it("never lets a nil target match a dashboard that has no uuid either", () => {
        // nil equals nil, so a comparison of the two would open a dashboard the card never named.
        [null, undefined].forEach(target => {
            const tapped = tap(makeOpenDashboardCard(target), [{uuid: null}, {uuid: undefined}, {}]);

            jest.runAllTimers();

            assert.equal(tapped.action.onDashboardNotAvailable.mock.calls.length, 1, `target ${target}: calls to onDashboardNotAvailable`);
            assert.equal(tapped.action.onOpenDashboard.mock.calls.length, 0, `target ${target}: calls to onOpenDashboard`);
            assert.equal(tapped.carryFiltersOver.mock.calls.length, 0, `target ${target}: calls to carryFiltersOver`);
        });
    });

    it("a Custom Design Card with Open dashboard still opens its own page", () => {
        const reportCard = makeOpenDashboardCard("t1", {isFullyCustom: () => true});
        const tapped = tap(reportCard, [{uuid: "t1"}]);
        const {action, carryFiltersOver} = tapped;

        jest.runAllTimers();

        assert.equal(action.onFullyCustomCardPress.mock.calls.length, 1);
        assert.strictEqual(action.onFullyCustomCardPress.mock.calls[0][0], reportCard);
        assert.equal(action.onOpenDashboard.mock.calls.length, 0);
        assert.equal(action.onDashboardNotAvailable.mock.calls.length, 0);
        assert.equal(carryFiltersOver.mock.calls.length, 0);
        assertNoCardResultAndNoSubject(tapped);
    });
});
