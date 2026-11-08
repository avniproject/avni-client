// Verifies CustomDashboardService.carryFiltersOver. When a dashboard is opened from a tile, each filter it shares
// with the dashboard the user came from starts with the value it has there, an unset one included, so a filter cleared there is cleared here.
// Two filters are the same filter when the settings stored in DashboardFilter.filterConfig agree, so the rules are
// also tested one by one through filterSettingsMatch and isChosenFilterValue.
// Wherever a test expects nothing to carry, it also runs the same filters with identical settings (or a chosen value)
// and expects them to carry. That way a mistake in the setup cannot make a "does not carry" test pass on its own.

import {assert} from "chai";
import {Concept, CustomFilter, Range, SubjectType} from "openchs-models";

jest.mock("../../../src/framework/bean/Service", () => () => (target) => target);

import CustomDashboardService, {filterSettingsMatch, isChosenFilterValue} from "../../../src/service/customDashboard/CustomDashboardService";
import CustomDashboardCacheService from "../../../src/service/CustomDashboardCacheService";
import DashboardFilterService from "../../../src/service/reports/DashboardFilterService";
import FormMetaDataSelection from "../../../src/model/FormMetaDataSelection";
import AddressFilterValue from "../../../src/model/AddressFilterValue";
import {filterRow, setUpPhone, setUpWithRealSave} from "./DashboardFilterCacheTestPhone";

const Type = CustomFilter.type;
const Widget = CustomFilter.widget;
const Scope = CustomFilter.scope;

// The settings stored in DashboardFilter.filterConfig. `changes` replaces any of them.
function settings(type, changes = {}) {
    return {type, widget: null, subjectTypeUUID: "st-1", ...changes};
}

function conceptSettings(conceptUUID, scope = Scope.Registration, changes = {}) {
    const observationBasedFilter = {scope, conceptUUID, programUUIDs: [], encounterTypeUUIDs: [], ...changes};
    return settings(Type.Concept, {observationBasedFilter});
}

function groupSubjectSettings(groupSubjectTypeUUID) {
    return settings(Type.GroupSubject, {groupSubjectTypeFilter: {subjectTypeUUID: groupSubjectTypeUUID}});
}

// Each call builds a new value, so no two tests share one.
const addressSelection = (name = "Village 1") => new AddressFilterValue([{uuid: `address-${name}`, name, level: 1, type: "Village"}], []);
const dateRange = () => new Range(new Date("2026-01-01"), new Date("2026-01-31"));
const aDate = () => new Date("2026-02-15");
const subjectTypeSelection = () => new FormMetaDataSelection([{uuid: "st-1", name: "Household"}], [], []);
const otherSubjectTypeSelection = () => new FormMetaDataSelection([{uuid: "st-2", name: "Person"}], [], []);
const codedAnswers = () => [{uuid: "answer-1", name: "Answer 1"}];
const individuals = () => [{uuid: "individual-1", name: "Household 1"}];

// A service of its own for each test, with the two dashboards' filters and saved values behind it.
// getDashboardData, setSelectedFilterValues and the cache's clearResults are spies, so nothing reaches the phone database.
function setUp({sourceFilters = [], targetFilters = [], sourceValues = {}, targetValues = {}}) {
    const filters = {source: sourceFilters, target: targetFilters};
    const savedValues = {source: sourceValues, target: targetValues};
    const clearResults = jest.fn();
    const stubs = new Map([
        [DashboardFilterService, {getFilters: (dashboardUUID) => filters[dashboardUUID]}],
        [CustomDashboardCacheService, {clearResults}],
    ]);
    const service = new CustomDashboardService(null, null);
    service.getService = (klass) => stubs.get(klass);
    jest.spyOn(service, "getDashboardData").mockImplementation((dashboardUUID) => ({selectedFilterValues: savedValues[dashboardUUID], dashboardCache: {}}));
    const setSelectedFilterValues = jest.spyOn(service, "setSelectedFilterValues").mockImplementation(() => undefined);
    return {service, setSelectedFilterValues, clearResults};
}

const writtenValues = (setSelectedFilterValues) => setSelectedFilterValues.mock.calls[0][1];

// One source filter holding source.value() and one target filter holding its own target.value(), each given as {settings, value}.
function carryBetween({source, target}) {
    const sourceValue = source.value();
    const ownValue = target.value();
    const targetValues = {t1: ownValue};
    const {service, setSelectedFilterValues} = setUp({
        sourceFilters: [filterRow("s1", "Filter", source.settings)],
        targetFilters: [filterRow("t1", "Filter", target.settings)],
        sourceValues: {s1: sourceValue},
        targetValues,
    });
    const carried = service.carryFiltersOver("source", "target");
    return {carried, setSelectedFilterValues, sourceValue, ownValue, targetValues};
}

function assertNothingCarried(outcome) {
    assert.isFalse(outcome.carried);
    assert.equal(outcome.setSelectedFilterValues.mock.calls.length, 0);
    assert.strictEqual(outcome.targetValues.t1, outcome.ownValue);
}

function assertCarried(outcome) {
    assert.isTrue(outcome.carried);
    assert.equal(outcome.setSelectedFilterValues.mock.calls.length, 1);
    assert.strictEqual(writtenValues(outcome.setSelectedFilterValues).t1, outcome.sourceValue);
}

describe("CustomDashboardService.carryFiltersOver", () => {
    it("copies a value to a target filter with the same type and settings", () => {
        const address = addressSelection();
        const registered = dateRange();
        const asOn = aDate();
        const {service, setSelectedFilterValues} = setUp({
            sourceFilters: [
                filterRow("s-address", "Village", settings(Type.Address)),
                filterRow("s-registered", "Registered", settings(Type.RegistrationDate, {widget: Widget.Range})),
                filterRow("s-as-on", "As on", settings(Type.AsOnDate)),
            ],
            targetFilters: [
                filterRow("t-address", "Village", settings(Type.Address)),
                filterRow("t-registered", "Registered", settings(Type.RegistrationDate, {widget: Widget.Range})),
                filterRow("t-as-on", "As on", settings(Type.AsOnDate)),
            ],
            sourceValues: {"s-address": address, "s-registered": registered, "s-as-on": asOn},
            targetValues: {"t-address": AddressFilterValue.empty(), "t-registered": Range.empty(), "t-as-on": null},
        });

        assert.isTrue(service.carryFiltersOver("source", "target"));

        assert.equal(setSelectedFilterValues.mock.calls.length, 1);
        const [dashboardUUID, values, filterApplied] = setSelectedFilterValues.mock.calls[0];
        assert.equal(dashboardUUID, "target");
        assert.strictEqual(values["t-address"], address);
        assert.strictEqual(values["t-registered"], registered);
        assert.strictEqual(values["t-as-on"], asOn);
        assert.isTrue(filterApplied);
    });

    describe("does not copy between filters whose settings differ", () => {
        const differing = [
            ["a RegistrationDate filter with a different subject type",
                {settings: settings(Type.RegistrationDate, {subjectTypeUUID: "st-1", widget: Widget.Range}), value: dateRange},
                {settings: settings(Type.RegistrationDate, {subjectTypeUUID: "st-2", widget: Widget.Range}), value: dateRange}],
            ["an Address filter with a different subject type",
                {settings: settings(Type.Address, {subjectTypeUUID: "st-1"}), value: addressSelection},
                {settings: settings(Type.Address, {subjectTypeUUID: "st-2"}), value: addressSelection}],
            ["an Address filter against a Concept filter",
                {settings: settings(Type.Address), value: addressSelection},
                {settings: conceptSettings("c-1"), value: codedAnswers}],
            ["a Concept filter with a different concept",
                {settings: conceptSettings("c-1"), value: codedAnswers},
                {settings: conceptSettings("c-2"), value: codedAnswers}],
            ["a Concept filter with the same concept and a different scope",
                {settings: conceptSettings("c-1", Scope.Registration), value: codedAnswers},
                {settings: conceptSettings("c-1", Scope.ProgramEnrolment), value: codedAnswers}],
            ["a GroupSubject filter with a different group subject type",
                {settings: groupSubjectSettings("household"), value: individuals},
                {settings: groupSubjectSettings("school"), value: individuals}],
            ["the same type with a different widget",
                {settings: settings(Type.RegistrationDate, {widget: Widget.Default}), value: aDate},
                {settings: settings(Type.RegistrationDate, {widget: Widget.Range}), value: dateRange}],
        ];

        differing.forEach(([label, source, target]) => {
            it(label, () => {
                assertNothingCarried(carryBetween({source, target}));
                // The same two filters with identical settings do carry, so the settings above are what kept them apart.
                assertCarried(carryBetween({source, target: {...target, settings: source.settings}}));
            });
        });
    });

    it("ignores a stale subject type where the type does not use one", () => {
        const asOn = aDate();
        const {service, setSelectedFilterValues} = setUp({
            sourceFilters: [filterRow("s1", "As on", settings(Type.AsOnDate, {subjectTypeUUID: "st-1"}))],
            targetFilters: [filterRow("t1", "As on", settings(Type.AsOnDate, {subjectTypeUUID: "st-2"}))],
            sourceValues: {s1: asOn},
            targetValues: {t1: null},
        });

        assert.isTrue(service.carryFiltersOver("source", "target"));

        assert.strictEqual(writtenValues(setSelectedFilterValues).t1, asOn);
    });

    it("matches Subject Type filters on type alone", () => {
        const selection = subjectTypeSelection();
        const {service, setSelectedFilterValues} = setUp({
            sourceFilters: [filterRow("s1", "Type", settings(Type.SubjectType, {subjectTypeUUID: "st-1", widget: Widget.Default}))],
            targetFilters: [filterRow("t1", "Type", settings(Type.SubjectType, {subjectTypeUUID: null, widget: null}))],
            sourceValues: {s1: selection},
            targetValues: {t1: FormMetaDataSelection.createNew()},
        });

        assert.isTrue(service.carryFiltersOver("source", "target"));

        assert.strictEqual(writtenValues(setSelectedFilterValues).t1, selection);
    });

    it("does not match on a subject type missing from the phone", () => {
        // The phone looks a subject type it lacks up as nothing, so comparing what it found would match "gone" with no subject type.
        const gone = {settings: settings(Type.Address, {subjectTypeUUID: "gone"}), value: addressSelection};
        const none = {settings: settings(Type.Address, {subjectTypeUUID: null}), value: addressSelection};

        assertNothingCarried(carryBetween({source: gone, target: none}));
        assertCarried(carryBetween({source: gone, target: gone}));
    });

    it("leaves target filters the source lacks as they were", () => {
        const fromSource = addressSelection("From source");
        const ownRange = dateRange();
        const {service, setSelectedFilterValues} = setUp({
            sourceFilters: [filterRow("s-address", "Village", settings(Type.Address))],
            targetFilters: [
                filterRow("t-address", "Village", settings(Type.Address)),
                filterRow("t-registered", "Registered", settings(Type.RegistrationDate, {widget: Widget.Range})),
            ],
            sourceValues: {"s-address": fromSource},
            targetValues: {"t-address": AddressFilterValue.empty(), "t-registered": ownRange},
        });

        assert.isTrue(service.carryFiltersOver("source", "target"));

        const values = writtenValues(setSelectedFilterValues);
        assert.strictEqual(values["t-address"], fromSource);
        assert.strictEqual(values["t-registered"], ownRange);
        assert.sameMembers(Object.keys(values), ["t-address", "t-registered"]);
    });

    // [what is unset, the filter's settings, how to build the unset value, how to build a chosen one, and how to build another chosen one
    // for a target to hold, where the same value carried again is not a write: a Subject Type selection]
    const unsetValues = [
        ["an empty date range", settings(Type.RegistrationDate, {widget: Widget.Range}), () => Range.empty(), dateRange],
        ["an empty subject type selection", settings(Type.SubjectType), () => FormMetaDataSelection.createNew(), subjectTypeSelection, otherSubjectTypeSelection],
        ["an empty list", settings(Type.Gender), () => [], codedAnswers],
        ["no value at all", settings(Type.AsOnDate), () => null, aDate],
        ["an empty address selection", settings(Type.Address), () => AddressFilterValue.empty(), addressSelection],
        ["an empty text", conceptSettings("c-text"), () => "", () => "typed text"],
        ["an unset location, as a new dashboard holds it", settings(Type.Address), () => [], addressSelection],
    ];

    describe("carries a value the user left unset, clearing the target's own", () => {
        unsetValues.forEach(([label, filterSettings, unsetValue, chosenValue, targetValue = chosenValue]) => {
            it(label, () => {
                const pair = (sourceValue) => ({
                    source: {settings: filterSettings, value: sourceValue},
                    target: {settings: filterSettings, value: targetValue},
                });

                assertCarried(carryBetween(pair(unsetValue)));
                // A chosen value carries too.
                assertCarried(carryBetween(pair(chosenValue)));
            });
        });
    });

    // The same carry through the real save and the real read back. Only storage and entity lookups are fake: an in-memory
    // store of the two dashboards and their caches, the filter rows and the subject type and concept they point at, and the
    // entities a saved uuid reads back as. The source's read stays stubbed, as above, so it gives the row's own value.
    describe("clears the target's saved value, through the real save", () => {
        // Seeds the target with its own chosen value through the real save, carries the source's value over, and returns what the target holds.
        function carryThroughRealSave(filterSettings, sourceValue, chosenValue) {
            const phone = setUpWithRealSave(filterSettings);
            const {service} = phone;
            const realGetDashboardData = service.getDashboardData.bind(service);
            // The source's value is the row's own, so the stubbed read gives it. The target's read is the real one.
            jest.spyOn(service, "getDashboardData").mockImplementation((dashboardUUID) => dashboardUUID === "source"
                ? {selectedFilterValues: {s1: sourceValue()}, dashboardCache: {}}
                : realGetDashboardData(dashboardUUID));

            // Saved as not applied, so the check that the target ends up applied shows the carry set it.
            service.setSelectedFilterValues("target", {t1: chosenValue()}, false);
            const seeded = service.getDashboardData("target").selectedFilterValues.t1;
            const carried = service.carryFiltersOver("source", "target");
            return {phone, seeded, carried, afterwards: service.getDashboardData("target").selectedFilterValues.t1};
        }

        unsetValues.forEach(([label, filterSettings, unsetValue, chosenValue, targetValue = chosenValue]) => {
            it(label, () => {
                const outcome = carryThroughRealSave(filterSettings, unsetValue, targetValue);

                // The store keeps a chosen value, so the clearing below is the carry's doing.
                assert.isTrue(isChosenFilterValue(outcome.seeded));
                assert.isTrue(outcome.carried);
                assert.notProperty(outcome.phone.savedValues("target"), "t1");
                assert.isTrue(outcome.phone.cache("target").filterApplied);
                assert.isFalse(isChosenFilterValue(outcome.afterwards));

                // The same set-up carrying a chosen value stores it, and it reads back as chosen.
                const control = carryThroughRealSave(filterSettings, chosenValue, targetValue);
                assert.isTrue(control.carried);
                assert.property(control.phone.savedValues("target"), "t1");
                assert.isTrue(isChosenFilterValue(control.afterwards));
            });
        });
    });

    describe("writes nothing when the value is unset on both sides", () => {
        unsetValues.forEach(([label, filterSettings, unsetValue, chosenValue]) => {
            it(label, () => {
                const pair = (sourceValue) => ({
                    source: {settings: filterSettings, value: sourceValue},
                    target: {settings: filterSettings, value: unsetValue},
                });

                assertNothingCarried(carryBetween(pair(unsetValue)));
                // The same filters carry once the source has a chosen value.
                assertCarried(carryBetween(pair(chosenValue)));
            });
        });
    });

    it("clears a shared filter and leaves one only the target has", () => {
        const ownRange = dateRange();
        const unsetAddress = [];
        const {service, setSelectedFilterValues} = setUp({
            sourceFilters: [filterRow("s-address", "Village", settings(Type.Address))],
            targetFilters: [
                filterRow("t-address", "Village", settings(Type.Address)),
                filterRow("t-registered", "Registered", settings(Type.RegistrationDate, {widget: Widget.Range})),
            ],
            sourceValues: {"s-address": unsetAddress},
            targetValues: {"t-address": addressSelection(), "t-registered": ownRange},
        });

        assert.isTrue(service.carryFiltersOver("source", "target"));

        const values = writtenValues(setSelectedFilterValues);
        assert.strictEqual(values["t-address"], unsetAddress);
        assert.strictEqual(values["t-registered"], ownRange);
    });

    it("applies overrides after the copy", () => {
        const carried = addressSelection("Carried");
        const override = addressSelection("Override");
        const registered = dateRange();
        const genderOverride = codedAnswers();
        const {service, setSelectedFilterValues} = setUp({
            sourceFilters: [
                filterRow("s-address", "Village", settings(Type.Address)),
                filterRow("s-registered", "Registered", settings(Type.RegistrationDate, {widget: Widget.Range})),
            ],
            targetFilters: [
                filterRow("t-address", "Village", settings(Type.Address)),
                filterRow("t-registered", "Registered", settings(Type.RegistrationDate, {widget: Widget.Range})),
                filterRow("t-gender", "Gender", settings(Type.Gender)),
            ],
            sourceValues: {"s-address": carried, "s-registered": registered},
            targetValues: {"t-address": AddressFilterValue.empty(), "t-registered": Range.empty(), "t-gender": []},
        });

        assert.isTrue(service.carryFiltersOver("source", "target", {"t-address": override, "t-gender": genderOverride}));

        assert.equal(setSelectedFilterValues.mock.calls.length, 1);
        const [dashboardUUID, values, filterApplied] = setSelectedFilterValues.mock.calls[0];
        assert.equal(dashboardUUID, "target");
        assert.isTrue(filterApplied);
        assert.strictEqual(values["t-address"], override, "an override wins over the value that was carried");
        assert.strictEqual(values["t-registered"], registered, "a filter without an override still carries");
        assert.strictEqual(values["t-gender"], genderOverride, "an override lands on a filter the source had nothing for");
    });

    it("writes an override even when no filter carried", () => {
        const override = addressSelection("Override");
        const {service, setSelectedFilterValues} = setUp({
            sourceFilters: [],
            targetFilters: [filterRow("t-address", "Village", settings(Type.Address))],
            targetValues: {"t-address": AddressFilterValue.empty()},
        });

        assert.isTrue(service.carryFiltersOver("source", "target", {"t-address": override}));

        assert.equal(setSelectedFilterValues.mock.calls.length, 1);
        assert.strictEqual(writtenValues(setSelectedFilterValues)["t-address"], override);
    });

    it("writes nothing when no filter matches and there are no overrides", () => {
        const {service, setSelectedFilterValues} = setUp({
            sourceFilters: [filterRow("s1", "Village", settings(Type.Address))],
            targetFilters: [filterRow("t1", "Registered", settings(Type.RegistrationDate, {widget: Widget.Range}))],
            sourceValues: {s1: addressSelection()},
            targetValues: {t1: dateRange()},
        });

        assert.isFalse(service.carryFiltersOver("source", "target"));
        assert.isFalse(service.carryFiltersOver("source", "target", {}));
        assert.equal(setSelectedFilterValues.mock.calls.length, 0);
    });

    it("takes the first matching source filter by name", () => {
        const fromB = addressSelection("From B");
        const fromA = addressSelection("From A");
        // B comes first in the list and has the lower uuid, so only its name puts A first.
        const {service, setSelectedFilterValues} = setUp({
            sourceFilters: [
                filterRow("s-1", "B", settings(Type.Address)),
                filterRow("s-2", "A", settings(Type.Address)),
            ],
            targetFilters: [filterRow("t1", "Village", settings(Type.Address))],
            sourceValues: {"s-1": fromB, "s-2": fromA},
            targetValues: {t1: AddressFilterValue.empty()},
        });

        assert.isTrue(service.carryFiltersOver("source", "target"));

        assert.strictEqual(writtenValues(setSelectedFilterValues).t1, fromA);
    });

    it("takes the lower uuid when two source filters share a name", () => {
        const fromFirst = addressSelection("From s-1");
        const fromSecond = addressSelection("From s-2");
        const {service, setSelectedFilterValues} = setUp({
            sourceFilters: [
                filterRow("s-2", "Village", settings(Type.Address)),
                filterRow("s-1", "Village", settings(Type.Address)),
            ],
            targetFilters: [filterRow("t1", "Village", settings(Type.Address))],
            sourceValues: {"s-1": fromFirst, "s-2": fromSecond},
            targetValues: {t1: AddressFilterValue.empty()},
        });

        assert.isTrue(service.carryFiltersOver("source", "target"));

        assert.strictEqual(writtenValues(setSelectedFilterValues).t1, fromFirst);
    });

    it("takes a matching source filter with a chosen value over an unset one", () => {
        const chosen = addressSelection("Chosen");
        const {service, setSelectedFilterValues} = setUp({
            sourceFilters: [
                filterRow("s-1", "A", settings(Type.Address)),
                filterRow("s-2", "B", settings(Type.Address)),
            ],
            targetFilters: [filterRow("t1", "Village", settings(Type.Address))],
            sourceValues: {"s-1": AddressFilterValue.empty(), "s-2": chosen},
            targetValues: {t1: AddressFilterValue.empty()},
        });

        assert.isTrue(service.carryFiltersOver("source", "target"));

        assert.strictEqual(writtenValues(setSelectedFilterValues).t1, chosen);
    });

    it("clears the target with the first matching source filter's unset value when none is chosen", () => {
        const fromB = AddressFilterValue.empty();
        const fromA = AddressFilterValue.empty();
        const {service, setSelectedFilterValues} = setUp({
            sourceFilters: [
                filterRow("s-1", "B", settings(Type.Address)),
                filterRow("s-2", "A", settings(Type.Address)),
            ],
            targetFilters: [filterRow("t1", "Village", settings(Type.Address))],
            sourceValues: {"s-1": fromB, "s-2": fromA},
            targetValues: {t1: addressSelection()},
        });

        assert.isTrue(service.carryFiltersOver("source", "target"));

        assert.strictEqual(writtenValues(setSelectedFilterValues).t1, fromA);
    });

    it("lets an override win over a cleared value, and clears the other shared filters", () => {
        const override = addressSelection("Override");
        const unsetRange = Range.empty();
        const {service, setSelectedFilterValues} = setUp({
            sourceFilters: [
                filterRow("s-address", "Village", settings(Type.Address)),
                filterRow("s-registered", "Registered", settings(Type.RegistrationDate, {widget: Widget.Range})),
            ],
            targetFilters: [
                filterRow("t-address", "Village", settings(Type.Address)),
                filterRow("t-registered", "Registered", settings(Type.RegistrationDate, {widget: Widget.Range})),
            ],
            sourceValues: {"s-address": [], "s-registered": unsetRange},
            targetValues: {"t-address": addressSelection(), "t-registered": dateRange()},
        });

        assert.isTrue(service.carryFiltersOver("source", "target", {"t-address": override}));

        const values = writtenValues(setSelectedFilterValues);
        assert.strictEqual(values["t-address"], override, "an override wins over the cleared value");
        assert.strictEqual(values["t-registered"], unsetRange, "a filter without an override is cleared");
    });

    describe("the target's cached counts", () => {
        // With auto refresh off, the counts refresh reuses cached counts, so counts kept from the target's old filters
        // would show beside the carried ones. Every other write of a dashboard's filters clears its cached counts too.
        it("are cleared once, right after the write, when something carried", () => {
            const {service, setSelectedFilterValues, clearResults} = setUp({
                sourceFilters: [filterRow("s1", "Village", settings(Type.Address))],
                targetFilters: [filterRow("t1", "Village", settings(Type.Address))],
                sourceValues: {s1: addressSelection()},
                targetValues: {t1: AddressFilterValue.empty()},
            });

            assert.isTrue(service.carryFiltersOver("source", "target"));

            assert.deepEqual(clearResults.mock.calls, [["target"]]);
            assert.isBelow(setSelectedFilterValues.mock.invocationCallOrder[0], clearResults.mock.invocationCallOrder[0], "the clear comes after the write");
        });

        it("are cleared when a cleared value is carried", () => {
            const {service, setSelectedFilterValues, clearResults} = setUp({
                sourceFilters: [filterRow("s1", "Village", settings(Type.Address))],
                targetFilters: [filterRow("t1", "Village", settings(Type.Address))],
                sourceValues: {s1: []},
                targetValues: {t1: addressSelection()},
            });

            assert.isTrue(service.carryFiltersOver("source", "target"));

            assert.deepEqual(clearResults.mock.calls, [["target"]]);
            assert.isBelow(setSelectedFilterValues.mock.invocationCallOrder[0], clearResults.mock.invocationCallOrder[0], "the clear comes after the write");
        });

        it("are not cleared when the value is unset on both sides", () => {
            const run = (sourceValue) => {
                const {service, clearResults} = setUp({
                    sourceFilters: [filterRow("s1", "Village", settings(Type.Address))],
                    targetFilters: [filterRow("t1", "Village", settings(Type.Address))],
                    sourceValues: {s1: sourceValue},
                    targetValues: {t1: []},
                });
                service.carryFiltersOver("source", "target");
                return clearResults;
            };

            assert.equal(run([]).mock.calls.length, 0);
            // The same filters clear the counts once the source has a chosen value.
            assert.equal(run(addressSelection()).mock.calls.length, 1);
        });

        it("are never cleared when nothing carried", () => {
            const {service, clearResults} = setUp({
                sourceFilters: [filterRow("s1", "Village", settings(Type.Address))],
                targetFilters: [filterRow("t1", "Registered", settings(Type.RegistrationDate, {widget: Widget.Range}))],
                sourceValues: {s1: addressSelection()},
                targetValues: {t1: dateRange()},
            });

            assert.isFalse(service.carryFiltersOver("source", "target"));
            assert.isFalse(service.carryFiltersOver("source", "target", {}));

            assert.equal(clearResults.mock.calls.length, 0);
        });

        it("are cleared when only an override was written, as an override is a write", () => {
            const {service, setSelectedFilterValues, clearResults} = setUp({
                sourceFilters: [],
                targetFilters: [filterRow("t-address", "Village", settings(Type.Address))],
                targetValues: {"t-address": AddressFilterValue.empty()},
            });

            assert.isTrue(service.carryFiltersOver("source", "target", {"t-address": addressSelection("Override")}));

            assert.deepEqual(clearResults.mock.calls, [["target"]]);
            assert.isBelow(setSelectedFilterValues.mock.invocationCallOrder[0], clearResults.mock.invocationCallOrder[0], "the clear comes after the write");
        });
    });
});

// Both reads are the real ones, so a source's own preset is in its value. Seeds each side through the real save when a value is given.
describe("CustomDashboardService.carryFiltersOver into a Subject Type filter with a preset", () => {
    const st1 = {uuid: "st-1", name: "Household", voided: false};
    const st2 = {uuid: "st-2", name: "Person", voided: false};
    const p1 = {uuid: "p-1", name: "Child", voided: false};
    const e = (uuid) => ({uuid, name: uuid});
    const sel = (subjectTypes, programs = [], encounterTypes = []) => new FormMetaDataSelection(subjectTypes, programs, encounterTypes);
    const uuids = (list) => list.map((x) => x.uuid);
    const typeSettings = (preset = {}) => settings(Type.SubjectType, {widget: Widget.Default, subjectTypeUUID: null, ...preset});
    const presetST1 = {presetSubjectTypeUUID: "st-1"};
    const presetST1P1 = {presetSubjectTypeUUID: "st-1", presetProgramUUID: "p-1"};

    function carry({sourceSettings = typeSettings(), targetSettings, sourceValue, targetValue}) {
        const phone = setUpPhone({
            dashboards: {
                source: [filterRow("s1", "Filter", sourceSettings)],
                target: [filterRow("t1", "Filter", targetSettings)],
            },
            subjectTypes: [st1, st2],
            programs: [p1],
        });
        const {service, cacheService} = phone;
        // Saved as not applied, so the check that the target ends up applied shows the carry set it.
        if (sourceValue) service.setSelectedFilterValues("source", {s1: sourceValue}, true);
        if (targetValue) service.setSelectedFilterValues("target", {t1: targetValue}, false);
        const clearResults = jest.spyOn(cacheService, "clearResults").mockImplementation(() => undefined);
        const write = jest.spyOn(service, "setSelectedFilterValues");
        const carried = service.carryFiltersOver("source", "target");
        return {phone, carried, writes: write.mock.calls.length, clears: clearResults.mock.calls.length, held: () => service.getDashboardData("target").selectedFilterValues.t1};
    }

    const assertWroteNothing = (outcome) => {
        assert.isFalse(outcome.carried);
        assert.equal(outcome.writes, 0);
        assert.equal(outcome.clears, 0);
    };

    it("carries a selection that agrees with the preset, visit types included", () => {
        const outcome = carry({targetSettings: typeSettings(presetST1P1), sourceValue: sel([st1], [p1], [e("e-1")])});
        assert.isTrue(outcome.carried);
        assert.property(outcome.phone.savedValues("target"), "t1");
        assert.isTrue(outcome.phone.cache("target").filterApplied);
        assert.equal(outcome.clears, 1);
        assert.deepEqual(uuids(outcome.held().encounterTypes), ["e-1"]);
    });

    it("returns the target to its preset when the carried selection has another subject type", () => {
        const outcome = carry({targetSettings: typeSettings(presetST1), sourceValue: sel([st2]), targetValue: sel([st1], [], [e("e-5")])});
        assert.isTrue(outcome.carried);
        assert.notProperty(outcome.phone.savedValues("target"), "t1");
        assert.isTrue(outcome.phone.cache("target").filterApplied);
        assert.equal(outcome.clears, 1);
        assert.deepEqual(uuids(outcome.held().subjectTypes), ["st-1"]);
        assert.deepEqual(outcome.held().encounterTypes, []);
    });

    it("writes nothing when the carried selection has another subject type and the target is at its preset", () => {
        assertWroteNothing(carry({targetSettings: typeSettings(presetST1), sourceValue: sel([st2])}));
        // The same filters carry once the selection agrees with the preset.
        assert.isTrue(carry({targetSettings: typeSettings(presetST1), sourceValue: sel([st1], [], [e("e-1")])}).carried);
    });

    it("writes nothing when the carried selection lacks the preset program and the target is at its preset", () => {
        assertWroteNothing(carry({targetSettings: typeSettings(presetST1P1), sourceValue: sel([st1], [], [e("e-9")])}));
        assert.isTrue(carry({targetSettings: typeSettings(presetST1P1), sourceValue: sel([st1], [p1], [e("e-9")])}).carried);
    });

    it("returns the target to its preset when the carried value is unset", () => {
        const outcome = carry({targetSettings: typeSettings(presetST1P1), targetValue: sel([st1], [p1], [e("e-1")])});
        assert.isTrue(outcome.carried);
        assert.notProperty(outcome.phone.savedValues("target"), "t1");
        assert.isTrue(outcome.phone.cache("target").filterApplied);
        assert.equal(outcome.clears, 1);
        assert.deepEqual(outcome.held().encounterTypes, []);
    });

    it("writes nothing when the carried value is unset and the target is at its preset", () => {
        assertWroteNothing(carry({targetSettings: typeSettings(presetST1P1)}));
        // The same filters carry once the target holds a choice beyond its preset.
        assert.isTrue(carry({targetSettings: typeSettings(presetST1P1), targetValue: sel([st1], [p1], [e("e-1")])}).carried);
    });

    it("writes nothing between two dashboards with the same preset, both at it", () => {
        assertWroteNothing(carry({sourceSettings: typeSettings(presetST1), targetSettings: typeSettings(presetST1)}));
        // The same filters carry once the source has a visit type chosen.
        assert.isTrue(carry({sourceSettings: typeSettings(presetST1), targetSettings: typeSettings(presetST1), sourceValue: sel([st1], [], [e("e-1")])}).carried);
    });

    it("writes nothing on a second open from a preset dashboard into one without a preset", () => {
        const phone = setUpPhone({
            dashboards: {
                source: [filterRow("s1", "Filter", typeSettings(presetST1))],
                target: [filterRow("t1", "Filter", typeSettings())],
            },
            subjectTypes: [st1, st2],
            programs: [p1],
        });
        const {service, cacheService} = phone;
        const clearResults = jest.spyOn(cacheService, "clearResults").mockImplementation(() => undefined);
        const write = jest.spyOn(service, "setSelectedFilterValues");

        assert.isTrue(service.carryFiltersOver("source", "target"));
        assert.equal(write.mock.calls.length, 1);
        assert.equal(clearResults.mock.calls.length, 1);

        assert.isFalse(service.carryFiltersOver("source", "target"));
        assert.equal(write.mock.calls.length, 1);
        assert.equal(clearResults.mock.calls.length, 1);

        // A different source value still carries.
        service.setSelectedFilterValues("source", {s1: sel([st1], [], [e("e-1")])}, true);
        write.mockClear();
        assert.isTrue(service.carryFiltersOver("source", "target"));
        assert.equal(clearResults.mock.calls.length, 2);
        assert.deepEqual(uuids(service.getDashboardData("target").selectedFilterValues.t1.encounterTypes), ["e-1"]);
    });

    it("carries a source's preset into a target without one", () => {
        const outcome = carry({sourceSettings: typeSettings(presetST1), targetSettings: typeSettings()});
        assert.isTrue(outcome.carried);
        assert.deepEqual(uuids(outcome.held().subjectTypes), ["st-1"]);
        assert.deepEqual(outcome.held().programs, []);
        assert.deepEqual(outcome.held().encounterTypes, []);
    });
});

describe("filterSettingsMatch", () => {
    it("treats a missing setting and a null one as the same", () => {
        assert.isTrue(filterSettingsMatch(
            {type: Type.Address, subjectTypeUUID: "st-1"},
            {type: Type.Address, subjectTypeUUID: "st-1", widget: null, groupSubjectTypeFilter: null}));
        assert.isTrue(filterSettingsMatch(
            settings(Type.GroupSubject, {groupSubjectTypeFilter: {}}),
            settings(Type.GroupSubject)));
    });

    it("does not compare the programs or encounter types of a Concept filter", () => {
        assert.isTrue(filterSettingsMatch(
            conceptSettings("c-1", Scope.ProgramEncounter, {programUUIDs: ["p-1"], encounterTypeUUIDs: ["e-1"]}),
            conceptSettings("c-1", Scope.ProgramEncounter, {programUUIDs: ["p-2"], encounterTypeUUIDs: ["e-2", "e-3"]})));
    });

    it("compares the subject type for every type except Subject Type and As On Date", () => {
        Object.values(Type).forEach(type => {
            const ignoresSubjectType = [Type.SubjectType, Type.AsOnDate].includes(type);
            assert.equal(
                filterSettingsMatch(settings(type, {subjectTypeUUID: "st-1"}), settings(type, {subjectTypeUUID: "st-2"})),
                ignoresSubjectType,
                `${type} filters with different subject types`);
        });
    });
});

describe("isChosenFilterValue", () => {
    it("is false for a value the user left unset", () => {
        [
            ["undefined", undefined],
            ["null", null],
            ["an empty array", []],
            ["an empty string", ""],
            ["an empty Range", Range.empty()],
            ["an empty FormMetaDataSelection", FormMetaDataSelection.createNew()],
            ["an empty AddressFilterValue", AddressFilterValue.empty()],
        ].forEach(([label, value]) => assert.isFalse(isChosenFilterValue(value), label));
    });

    it("is true for a value the user chose, including a Date", () => {
        // lodash calls a Date empty, so a check built on _.isEmpty would drop every date the user picked.
        [
            ["a Date", aDate()],
            ["a Range", dateRange()],
            ["an AddressFilterValue", addressSelection()],
            ["a FormMetaDataSelection", subjectTypeSelection()],
            ["a list", codedAnswers()],
            ["a text", "typed text"],
        ].forEach(([label, value]) => assert.isTrue(isChosenFilterValue(value), label));
    });
});
