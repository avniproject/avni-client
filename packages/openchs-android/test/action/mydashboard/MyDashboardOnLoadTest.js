// Covers the two #1865 load-path regressions reported in #2022:
//  A. re-entering My Dashboard recomputed the card numbers from entity lists that the
//     count-only path deliberately leaves empty, so every card fell to 0.
//  B. a custom filter latched the screen at 0 until the app was restarted, and never
//     restricted the counts when it did match subjects.

import {assert} from "chai";
import _ from "lodash";

jest.mock("../../../src/framework/bean/Service", () => () => (target) => target);
jest.mock("../../../src/utility/Analytics", () => ({logEvent: () => {}, firebaseEvents: {MY_DASHBOARD_FILTER: "my_dashboard_filter"}}));

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

const dueSubject = (uuid) => ({individual: {uuid}, visitInfo: {uuid}});
const noDueChecklist = () => ({individual: [], checklistItemNames: []});

function makeIndividualService(counts = UNFILTERED, dueChecklist = noDueChecklist) {
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
        dueChecklistForDefaultDashboard: (...args) => (record("dueChecklistForDefaultDashboard", args), dueChecklist()),
        // Entity lists, used by onListLoad when filters are applied from the list screen.
        allScheduledVisitsIn: () => [],
        allOverdueVisitsIn: () => [],
        recentlyCompletedVisitsIn: () => [],
        recentlyRegistered: () => [],
        recentlyEnrolled: () => [],
        allIn: () => []
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

// Resolving a custom filter scans observations (tens of seconds on a large org), so track how
// often it actually runs.
function makeCustomFilterService(matched) {
    const service = {
        resolutions: 0,
        isDashboardFiltersEmpty: (filters) => _.isEmpty(filters) || _.every(filters, _.isEmpty),
        applyCustomFilters: () => {
            service.resolutions += 1;
            return matched;
        }
    };
    return service;
}

describe("MyDashboardActions.onLoad due checklist card", () => {
    // Two enrolments for one subject: the card counts people, not rows (#2024).
    const twoDueOnePerson = () => ({
        individual: [dueSubject("child-1"), dueSubject("child-2"), dueSubject("child-1")],
        checklistItemNames: ["Vaccine A", "Vaccine B"]
    });

    function contextWith(dueChecklist, disableAutoRefresh = false) {
        return buildContext({
            individualService: makeIndividualService(UNFILTERED, dueChecklist),
            dashboardCacheService: makeDashboardCacheService(),
            customFilterService: noCustomFilters(),
            disableAutoRefresh
        });
    }

    const dueCountOf = (state) => Object.assign({}, ...state.visits.map((r) => r.visits)).dueChecklist.count;

    it("shows the number of people with a checklist due, and carries the list for the drill-down", () => {
        const context = contextWith(twoDueOnePerson);
        const state = MyDashboardActions.onLoad(MyDashboardActions.getInitialState(context), {}, context);

        assert.equal(dueCountOf(state), 2, "child-1 appears twice but is one person");
        assert.equal(state.dueChecklistWithChecklistItem.individual.length, 3);
        assert.deepEqual(state.dueChecklistWithChecklistItem.checklistItemNames, ["Vaccine A", "Vaccine B"]);
    });

    it("stays hidden for an org without checklists", () => {
        const context = contextWith(noDueChecklist);
        const state = MyDashboardActions.onLoad(MyDashboardActions.getInitialState(context), {}, context);
        assert.equal(dueCountOf(state), 0, "a zero count is what hides the row");
    });

    it("keeps the number across re-entry", () => {
        const context = contextWith(twoDueOnePerson);
        const loaded = MyDashboardActions.onLoad(MyDashboardActions.getInitialState(context), {}, context);
        const reEntered = MyDashboardActions.onLoad(loaded, {fetchFromDB: false}, context);
        assert.equal(dueCountOf(reEntered), 2);
        assert.equal(reEntered.dueChecklistWithChecklistItem.individual.length, 3);
    });

    it("never shows a due count it has no list for", () => {
        // The cached card carries a due count, but the list lives only in reducer state. After a
        // restart with auto-refresh off the list is gone, so the card must not offer a drill-down
        // onto an empty listing — StatusCountRow hands this list straight to ChecklistListingView.
        const dashboardCacheService = makeDashboardCacheService();
        dashboardCacheService.updateCard({...UNFILTERED, dueChecklist: 2});
        const context = buildContext({
            individualService: makeIndividualService(UNFILTERED, twoDueOnePerson),
            dashboardCacheService,
            customFilterService: noCustomFilters(),
            disableAutoRefresh: true
        });

        const afterRestart = MyDashboardActions.onLoad(MyDashboardActions.getInitialState(context), {}, context);
        assert.deepEqual(countsOf(afterRestart), UNFILTERED, "the other cards still come from cache");
        assert.equal(dueCountOf(afterRestart), 0);
        assert.isEmpty(afterRestart.dueChecklistWithChecklistItem.individual);
    });

    it("restricts the due checklist to the subjects a custom filter matched", () => {
        const individualService = makeIndividualService(UNFILTERED, twoDueOnePerson);
        const dashboardCacheService = makeDashboardCacheService();
        dashboardCacheService.setSelectedCustomFilters({Age: [{uuid: "opt-1"}]});
        const context = buildContext({
            individualService,
            dashboardCacheService,
            customFilterService: {isDashboardFiltersEmpty: () => false, applyCustomFilters: () => ["child-1"]}
        });

        MyDashboardActions.onLoad(MyDashboardActions.getInitialState(context), {}, context);
        assert.include(individualService.callTo("dueChecklistForDefaultDashboard").args[1], 'individual.uuid = "child-1"');
    });
});

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

    it("reuses the resolved subjects only where data cannot have changed the answer", () => {
        const dashboardCacheService = makeDashboardCacheService();
        dashboardCacheService.setSelectedCustomFilters({Age: [{uuid: "opt-1"}]});
        const customFilterService = makeCustomFilterService(["subject-1"]);
        const context = buildContext({
            individualService: makeIndividualService(),
            dashboardCacheService,
            customFilterService
        });

        let state = MyDashboardActions.onLoad(MyDashboardActions.getInitialState(context), {}, context);
        assert.equal(customFilterService.resolutions, 1);

        // applyCustomFilters takes no date, so Today/Tomorrow cannot change which subjects match.
        state = MyDashboardActions.onDate(state, {value: new Date("2026-08-26T00:00:00.000Z")}, context);
        assert.equal(customFilterService.resolutions, 1, "a date change cannot alter the matched subjects");

        // A plain re-entry does not recompute the counts at all.
        state = MyDashboardActions.onLoad(state, {fetchFromDB: false}, context);
        assert.equal(customFilterService.resolutions, 1, "no counts recomputed, nothing to resolve for");
        assert.deepEqual(countsOf(state), UNFILTERED);

        // A refresh must see subjects that became matches since the filter was applied.
        state = MyDashboardActions.onLoad(state, {fetchFromDB: true}, context);
        assert.equal(customFilterService.resolutions, 2);

        // Changing the filter re-resolves it.
        dashboardCacheService.setSelectedCustomFilters({Age: [{uuid: "opt-2"}]});
        state = MyDashboardActions.onLoad(state, {fetchFromDB: true}, context);
        assert.equal(customFilterService.resolutions, 3);

        // Clearing it needs no scan at all.
        dashboardCacheService.setSelectedCustomFilters({});
        state = MyDashboardActions.onLoad(state, {fetchFromDB: true}, context);
        assert.equal(customFilterService.resolutions, 3, "an empty filter needs no scan");
        assert.isNull(state.individualUUIDs);
    });

    it("counts subjects that became matches after the filter was applied", () => {
        // The worker registers a matching person offline, then refreshes. An upload-only
        // background sync would not have reset reducer state, so nothing else invalidates this.
        let matched = ["subject-1"];
        const individualService = makeIndividualService();
        const dashboardCacheService = makeDashboardCacheService();
        dashboardCacheService.setSelectedCustomFilters({Age: [{uuid: "opt-1"}]});
        const context = buildContext({
            individualService,
            dashboardCacheService,
            customFilterService: {isDashboardFiltersEmpty: () => false, applyCustomFilters: () => matched}
        });

        const state = MyDashboardActions.onLoad(MyDashboardActions.getInitialState(context), {}, context);
        assert.notInclude(individualService.callTo("countAllIn").args[2], '"subject-2"');

        matched = ["subject-1", "subject-2"];
        MyDashboardActions.onLoad(state, {fetchFromDB: true}, context);
        assert.include(individualService.callTo("countAllIn").args[2], '"subject-2"',
            "the newly matching subject must reach the counts without an app restart");
    });

    it("re-resolves after a sync, since RESET clears the memo", () => {
        const dashboardCacheService = makeDashboardCacheService();
        dashboardCacheService.setSelectedCustomFilters({Age: [{uuid: "opt-1"}]});
        const customFilterService = makeCustomFilterService(["subject-1"]);
        const context = buildContext({individualService: makeIndividualService(), dashboardCacheService, customFilterService});

        MyDashboardActions.onLoad(MyDashboardActions.getInitialState(context), {}, context);
        assert.equal(customFilterService.resolutions, 1);

        // SyncService.reset() dispatches RESET, which returns the reducer to its initial state.
        MyDashboardActions.onLoad(MyDashboardActions.getInitialState(context), {}, context);
        assert.equal(customFilterService.resolutions, 2, "freshly synced data must be re-filtered");
    });

    it("leaves the memo key and the resolved subjects describing the same filter on the list branch", () => {
        const dashboardCacheService = makeDashboardCacheService();
        const customFilterService = makeCustomFilterService(["subject-1"]);
        const context = buildContext({
            individualService: makeIndividualService(),
            dashboardCacheService,
            customFilterService
        });

        const selectedCustomFilters = {Age: [{uuid: "opt-1", subjectTypeUUID: SUBJECT_TYPE.uuid}]};
        const applyAction = {
            filters: new Map(),
            locationSearchCriteria: {clone: () => ({getAllAddressLevelUUIDs: () => []})},
            addressLevelState: {clone: () => ({levels: new Map(), anyActiveTypesArray: []}), anyActiveTypesArray: []},
            filterDate: new Date("2026-08-24T00:00:00.000Z"),
            programs: [], selectedPrograms: [], encounterTypes: [], selectedEncounterTypes: [],
            generalEncounterTypes: [], selectedGeneralEncounterTypes: [], selectedGenders: [],
            selectedLocations: [], selectedSubjectType: SUBJECT_TYPE,
            selectedCustomFilters,
            // FiltersView passes listType when filters are applied from the individual-list screen.
            listType: "total"
        };

        const afterList = MyDashboardActions.assignFilters(MyDashboardActions.getInitialState(context), applyAction, context);

        assert.deepEqual(afterList.individualUUIDs, ["subject-1"]);
        assert.equal(afterList.customFilterResolvedAgainst, JSON.stringify({Age: selectedCustomFilters.Age}),
            "key must describe the filter individualUUIDs was resolved from");

        // Once the counts have been recomputed, a later re-entry reuses that answer rather than
        // scanning again — which it can only do if the key describes the filter behind it.
        const resolutionsAfterApply = customFilterService.resolutions;
        MyDashboardActions.onLoad({...afterList, fetchFromDB: false}, {}, context);
        assert.equal(customFilterService.resolutions, resolutionsAfterApply, "no wasted re-scan");
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
