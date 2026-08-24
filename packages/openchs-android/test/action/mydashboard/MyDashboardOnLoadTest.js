// Covers the two #1865 load-path regressions reported in #2022:
//  A. re-entering My Dashboard recomputed the card numbers from entity lists that the
//     count-only path deliberately leaves empty, so every card fell to 0.
//  B. a custom filter latched the screen at 0 until the app was restarted, and never
//     restricted the counts when it did match subjects.

import {assert} from "chai";
import _ from "lodash";

jest.mock("../../../src/framework/bean/Service", () => () => (target) => target);

import {MyDashboardActions} from "../../../src/action/mydashboard/MyDashboardActions";

const SUBJECT_TYPE = {uuid: "st-1", name: "Person"};

const UNFILTERED = {
    scheduled: 4,
    overdue: 0,
    recentlyCompletedVisits: 6,
    recentlyCompletedRegistration: 2,
    recentlyCompletedEnrolment: 2,
    total: 2
};

const ALL_ZERO = _.mapValues(UNFILTERED, () => 0);

function makeIndividualService(counts = UNFILTERED) {
    const calls = [];
    const record = (name, args) => calls.push({name, args});
    return {
        calls,
        callTo: (name) => calls.filter((c) => c.name === name).pop(),
        countScheduledVisits: (...args) => (record("countScheduledVisits", args), counts.scheduled),
        countOverdueVisits: (...args) => (record("countOverdueVisits", args), counts.overdue),
        countRecentlyCompletedVisits: (...args) => (record("countRecentlyCompletedVisits", args), counts.recentlyCompletedVisits),
        countRecentlyRegistered: (...args) => (record("countRecentlyRegistered", args), counts.recentlyCompletedRegistration),
        countRecentlyEnrolled: (...args) => (record("countRecentlyEnrolled", args), counts.recentlyCompletedEnrolment),
        countAllIn: (...args) => (record("countAllIn", args), counts.total),
        dueChecklistForDefaultDashboard: () => ({individual: [], checklistItemNames: []})
    };
}

// Mirrors DashboardCache: filter and card are stored as JSON, so every read is a fresh copy.
function makeDashboardCacheService() {
    let filterJSON = JSON.stringify({selectedCustomFilters: {}});
    let cardJSON = "{}";
    const readFilter = () => {
        const filter = JSON.parse(filterJSON);
        if (!_.isEmpty(filter.filterDate)) filter.filterDate = new Date(filter.filterDate);
        return filter;
    };
    return {
        getCache: () => ({getFilter: readFilter, getCard: () => JSON.parse(cardJSON)}),
        updateFilter: (f) => (filterJSON = JSON.stringify(f)),
        updateCard: (c) => (cardJSON = JSON.stringify(c)),
        setSelectedCustomFilters: (selectedCustomFilters) => {
            filterJSON = JSON.stringify({...readFilter(), selectedCustomFilters});
        }
    };
}

function buildContext({individualService, dashboardCacheService, customFilterService, disableAutoRefresh = false}) {
    const stubs = new Map([
        ["IndividualService", individualService],
        ["DashboardCacheService", dashboardCacheService],
        ["CustomFilterService", customFilterService],
        ["SubjectTypeService", {getAllowedSubjectTypes: () => [SUBJECT_TYPE], findByUUID: () => SUBJECT_TYPE}],
        ["PrivilegeService", {displayProgramTab: () => true}],
        ["UserInfoService", {getUserSettings: () => ({disableAutoRefresh})}]
    ]);
    return {get: (klass) => stubs.get(klass.name)};
}

function countsOf(state) {
    const cards = Object.assign({}, ...state.visits.map((row) => row.visits));
    return _.mapValues(UNFILTERED, (ignored, key) => cards[key].count);
}

const noCustomFilters = () => ({isDashboardFiltersEmpty: () => true, applyCustomFilters: () => []});

describe("MyDashboardActions.onLoad card counts", () => {
    it("keeps the numbers when the screen is re-entered without a fresh fetch", () => {
        const context = buildContext({
            individualService: makeIndividualService(),
            dashboardCacheService: makeDashboardCacheService(),
            customFilterService: noCustomFilters()
        });

        const afterFirstLoad = MyDashboardActions.onLoad(MyDashboardActions.getInitialState(context), {}, context);
        assert.deepEqual(countsOf(afterFirstLoad), UNFILTERED);

        // MyDashboardView dispatches ON_LOAD on every mount; on re-entry fetchFromDB is false.
        const afterReEntry = MyDashboardActions.onLoad(afterFirstLoad, {fetchFromDB: false}, context);
        assert.deepEqual(countsOf(afterReEntry), UNFILTERED);

        assert.deepEqual(countsOf(MyDashboardActions.onLoad(afterReEntry, {fetchFromDB: false}, context)), UNFILTERED);
    });

    it("serves the cached numbers on first load when auto-refresh is off", () => {
        const dashboardCacheService = makeDashboardCacheService();
        dashboardCacheService.updateCard(UNFILTERED);
        const context = buildContext({
            individualService: makeIndividualService(),
            dashboardCacheService,
            customFilterService: noCustomFilters(),
            disableAutoRefresh: true
        });

        const state = MyDashboardActions.onLoad(MyDashboardActions.getInitialState(context), {}, context);
        assert.deepEqual(countsOf(state), UNFILTERED);

        // The manual refresh button dispatches ON_LOAD with fetchFromDB: true.
        assert.deepEqual(countsOf(MyDashboardActions.onLoad(state, {fetchFromDB: true}, context)), UNFILTERED);
    });

    it("recomputes on the date toggle and on the way back", () => {
        const individualService = makeIndividualService();
        const context = buildContext({
            individualService,
            dashboardCacheService: makeDashboardCacheService(),
            customFilterService: noCustomFilters()
        });

        const loaded = MyDashboardActions.onLoad(MyDashboardActions.getInitialState(context), {}, context);
        const tomorrow = new Date("2026-08-25T00:00:00.000Z");
        const onTomorrow = MyDashboardActions.onDate(loaded, {value: tomorrow}, context);

        assert.deepEqual(countsOf(onTomorrow), UNFILTERED);
        assert.equal(new Date(individualService.callTo("countScheduledVisits").args[0]).getTime(), tomorrow.getTime());

        const today = new Date("2026-08-24T00:00:00.000Z");
        const backToToday = MyDashboardActions.onDate(onTomorrow, {value: today}, context);
        assert.deepEqual(countsOf(backToToday), UNFILTERED);
        assert.equal(new Date(individualService.callTo("countScheduledVisits").args[0]).getTime(), today.getTime());
    });

    it("restricts the counts to the subjects a custom filter matched", () => {
        const individualService = makeIndividualService();
        const dashboardCacheService = makeDashboardCacheService();
        dashboardCacheService.setSelectedCustomFilters({Age: [{uuid: "opt-1"}]});
        const context = buildContext({
            individualService,
            dashboardCacheService,
            customFilterService: {
                isDashboardFiltersEmpty: () => false,
                applyCustomFilters: () => ["subject-1", "subject-2"]
            }
        });

        const state = MyDashboardActions.onLoad(MyDashboardActions.getInitialState(context), {}, context);

        assert.deepEqual(countsOf(state), UNFILTERED);
        const scheduled = individualService.callTo("countScheduledVisits");
        assert.include(scheduled.args[2], 'programEnrolment.individual.uuid = "subject-1"');
        assert.include(scheduled.args[3], 'individual.uuid = "subject-2"');
        assert.include(individualService.callTo("countAllIn").args[2], 'uuid = "subject-1"');
        assert.include(individualService.callTo("countRecentlyEnrolled").args[2], 'individual.uuid = "subject-1"');
    });

    it("chunks a large custom filter so the query stays inside SQLite's expression depth limit", () => {
        const subjectUUIDs = _.times(1200, (i) => `subject-${i}`);
        const individualService = makeIndividualService({...UNFILTERED, scheduled: 1, total: 1});
        const dashboardCacheService = makeDashboardCacheService();
        dashboardCacheService.setSelectedCustomFilters({Age: [{uuid: "opt-1"}]});
        const context = buildContext({
            individualService,
            dashboardCacheService,
            customFilterService: {isDashboardFiltersEmpty: () => false, applyCustomFilters: () => subjectUUIDs}
        });

        const state = MyDashboardActions.onLoad(MyDashboardActions.getInitialState(context), {}, context);

        const scheduledCalls = individualService.calls.filter((c) => c.name === "countScheduledVisits");
        assert.equal(scheduledCalls.length, 3, "1200 subjects must be counted over three chunks of 500");
        scheduledCalls.forEach(({args}) => {
            args.slice(2).forEach((criteria) => assert.isAtMost((criteria.match(/ OR /g) || []).length, 499));
        });
        // Every row belongs to exactly one subject, so the chunk counts sum without double counting.
        assert.equal(countsOf(state).scheduled, 3);
        assert.equal(countsOf(state).total, 3);
        assert.deepEqual(_.uniq(subjectUUIDs.map((uuid) => scheduledCalls.some(({args}) => args[2].includes(`"${uuid}"`)))), [true]);
    });

    it("zeroes the cards for a custom filter that matches nothing, and restores them when it is cleared", () => {
        const individualService = makeIndividualService();
        const dashboardCacheService = makeDashboardCacheService();
        dashboardCacheService.setSelectedCustomFilters({Age: [{uuid: "opt-1"}]});
        const context = buildContext({
            individualService,
            dashboardCacheService,
            customFilterService: {
                isDashboardFiltersEmpty: (filters) => _.isEmpty(filters.Age),
                applyCustomFilters: () => []
            }
        });

        const zeroed = MyDashboardActions.onLoad(MyDashboardActions.getInitialState(context), {}, context);
        assert.deepEqual(countsOf(zeroed), ALL_ZERO);
        assert.deepEqual(countsOf(MyDashboardActions.onLoad(zeroed, {fetchFromDB: false}, context)), ALL_ZERO);

        // Clearing the filter must bring the numbers back without an app restart.
        dashboardCacheService.setSelectedCustomFilters({});
        const restored = MyDashboardActions.onLoad(zeroed, {fetchFromDB: true}, context);
        assert.deepEqual(countsOf(restored), UNFILTERED);
        assert.deepEqual(countsOf(MyDashboardActions.onLoad(restored, {fetchFromDB: false}, context)), UNFILTERED);
    });
});
