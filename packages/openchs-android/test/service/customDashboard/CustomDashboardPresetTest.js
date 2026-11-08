// A Subject Type filter can carry a preset subject type (and program). It is the filter's default: where nothing is saved the
// filter starts on it, and a saved value that disagrees with it is replaced by it when read, through CustomDashboardService.getDashboardData.
// Everything runs through the shared phone: real DashboardFilterService, CustomDashboardCacheService and CustomDashboardService.

import {assert} from "chai";
import {CustomFilter, Range} from "openchs-models";

jest.mock("../../../src/framework/bean/Service", () => () => (target) => target);

import CustomFilterService from "../../../src/service/CustomFilterService";
import FormMetaDataSelection from "../../../src/model/FormMetaDataSelection";
import {filterRow, setUpPhone} from "./DashboardFilterCacheTestPhone";

const Type = CustomFilter.type;
const Widget = CustomFilter.widget;

const st1 = {uuid: "st-1", name: "Household", voided: false};
const st2 = {uuid: "st-2", name: "Person", voided: false};
const p1 = {uuid: "p-1", name: "Child", voided: false};
const subjectTypes = [st1, st2];
const programs = [p1];

const subjectTypeSettings = (preset = {}) => ({type: Type.SubjectType, widget: Widget.Default, subjectTypeUUID: null, ...preset});
const presetST1P1 = {presetSubjectTypeUUID: "st-1", presetProgramUUID: "p-1"};
const sel = (st, p = [], e = []) => new FormMetaDataSelection(st, p, e);
const uuids = (list) => list.map((x) => x.uuid);

function phoneWith(filterSettings, extraRows = []) {
    return setUpPhone({
        dashboards: {d: [filterRow("f", "Type", filterSettings), ...extraRows]},
        subjectTypes,
        programs,
    });
}

const save = (phone, value) => phone.service.setSelectedFilterValues("d", {f: value}, true);
const read = (phone) => phone.service.getDashboardData("d").selectedFilterValues.f;

function assertSeed(value, st = ["st-1"], p = ["p-1"]) {
    assert.deepEqual(uuids(value.subjectTypes), st);
    assert.deepEqual(uuids(value.programs), p);
    assert.deepEqual(value.encounterTypes, []);
}

describe("a Subject Type filter with a preset", () => {
    it("starts the filter on its preset when nothing is saved", () => {
        assertSeed(read(phoneWith(subjectTypeSettings(presetST1P1))));
    });

    it("starts the filter empty without a preset, as today", () => {
        assert.isTrue(read(phoneWith(subjectTypeSettings())).isEmpty());
    });

    it("keeps a choice the user saved within the preset", () => {
        const phone = phoneWith(subjectTypeSettings(presetST1P1));
        save(phone, sel([st1], [p1], [{uuid: "e-1", name: "e-1"}]));
        const value = read(phone);
        assert.deepEqual(uuids(value.subjectTypes), ["st-1"]);
        assert.deepEqual(uuids(value.programs), ["p-1"]);
        assert.deepEqual(uuids(value.encounterTypes), ["e-1"]);
    });

    it("puts the preset back in place of a saved value that disagrees with it", () => {
        const phone = phoneWith(subjectTypeSettings(presetST1P1));
        save(phone, sel([st2]));
        assertSeed(read(phone));
    });

    it("puts the preset back when the saved subject type no longer reads back", () => {
        const phone = setUpPhone({
            dashboards: {d: [filterRow("f", "Type", subjectTypeSettings({presetSubjectTypeUUID: "st-1"}))]},
            subjectTypes: [st1],
            programs,
        });
        // A choice beyond the preset, as only that is saved.
        save(phone, sel([st1], [], [{uuid: "e-1", name: "e-1"}]));
        // The phone loses st-1 from what it reads back, as after a sync that removes it; the preset is st-1 itself, still looked up.
        phone.cacheService.getService = ((original) => (klass) => {
            const service = original(klass);
            return klass.name === "EntityService" ? {findAllByUUID: () => []} : service;
        })(phone.cacheService.getService);
        assertSeed(read(phone), ["st-1"], []);
    });

    describe("a choice saved beyond the preset", () => {
        const beyond = () => sel([st1], [p1], [{uuid: "e-1", name: "e-1"}]);
        const fresh = () => ({
            dashboards: {d: [filterRow("f", "Type", subjectTypeSettings(presetST1P1))]},
            subjectTypes: [{...st1}, {...st2}],
            programs: [{...p1}],
        });

        it("reads back unchanged while nothing is deleted", () => {
            const phone = setUpPhone(fresh());
            save(phone, beyond());
            const value = read(phone);
            assert.deepEqual(uuids(value.subjectTypes), ["st-1"]);
            assert.deepEqual(uuids(value.programs), ["p-1"]);
            assert.deepEqual(uuids(value.encounterTypes), ["e-1"]);
        });

        it("drops a deleted preset programme from a choice saved beyond the preset", () => {
            const setup = fresh();
            const phone = setUpPhone(setup);
            save(phone, beyond());
            setup.programs[0].voided = true;
            assertSeed(read(phone), ["st-1"], []);
        });

        it("drops a deleted preset subject type from a choice saved beyond the preset", () => {
            const setup = {
                dashboards: {d: [filterRow("f", "Type", subjectTypeSettings({presetSubjectTypeUUID: "st-1"}))]},
                subjectTypes: [{...st1}, {...st2}],
                programs: [{...p1}],
            };
            const phone = setUpPhone(setup);
            save(phone, sel([st1], [], [{uuid: "e-1", name: "e-1"}]));
            assert.deepEqual(uuids(read(phone).encounterTypes), ["e-1"]);
            setup.subjectTypes[0].voided = true;
            assert.isTrue(read(phone).isEmpty());
        });
    });

    it("does not look up the settings of other saved filters", () => {
        const phone = phoneWith(subjectTypeSettings(), [
            filterRow("g", "Registered", {type: Type.RegistrationDate, widget: Widget.Range, subjectTypeUUID: "st-1"}),
        ]);
        phone.service.setSelectedFilterValues("d", {f: sel([st2]), g: new Range(new Date(2026, 0, 1), new Date(2026, 0, 31))}, true);
        const lookup = jest.spyOn(phone.dashboardFilterService, "getDashboardFilterConfig");
        // Reading the saved values back looks each one up once, whatever reads them. Both filters are saved, so the second pass makes none.
        phone.cacheService.getDashboardCache("d");
        const readingTheCache = lookup.mock.calls.length;
        assert.equal(readingTheCache, 2);
        lookup.mockClear();
        phone.service.getDashboardData("d");
        assert.equal(lookup.mock.calls.length, readingTheCache, "the first pass looked up the settings of a saved filter");
    });

    it("returns to the preset after the filters are cleared", () => {
        const phone = phoneWith(subjectTypeSettings(presetST1P1));
        save(phone, sel([st1], [p1], [{uuid: "e-1", name: "e-1"}]));
        phone.cacheService.reset("d");
        assertSeed(read(phone));
    });

    it("resets a saved choice to the new preset when the preset changes", () => {
        const phone = phoneWith(subjectTypeSettings({presetSubjectTypeUUID: "st-1"}));
        save(phone, sel([st1], [], [{uuid: "e-1", name: "e-1"}]));
        phone.changeFilterSettings("f", subjectTypeSettings({presetSubjectTypeUUID: "st-2"}));
        assertSeed(read(phone), ["st-2"], []);
    });

    it("gives the cards the preset before the user picks anything", () => {
        const phone = phoneWith(subjectTypeSettings(presetST1P1));
        const inputs = phone.dashboardFilterService.toRuleInputObjects("d", phone.service.getDashboardData("d").selectedFilterValues);
        assert.equal(inputs.length, 1);
        assert.equal(inputs[0].type, Type.SubjectType);
        assert.deepEqual(uuids(inputs[0].filterValue.subjectTypes), ["st-1"]);
        assert.deepEqual(uuids(inputs[0].filterValue.programs), ["p-1"]);
    });

    describe("shows a filter set for the preset subject type straight away", () => {
        const registrationDate = {type: Type.RegistrationDate, widget: Widget.Range, subjectTypeUUID: "st-1"};
        const hidden = (preset) => {
            const phone = phoneWith(subjectTypeSettings(preset), [filterRow("g", "Registered", registrationDate)]);
            const filterConfigs = phone.dashboardFilterService.getFilterConfigsForDashboard("d");
            const seeded = phone.service.getDashboardData("d").selectedFilterValues;
            return CustomFilterService.prototype.shouldFilterBeHidden(filterConfigs, seeded, filterConfigs.g);
        };

        it("is shown for the preset subject type", () => assert.isFalse(hidden({presetSubjectTypeUUID: "st-1"})));
        it("is hidden for another preset subject type", () => assert.isTrue(hidden({presetSubjectTypeUUID: "st-2"})));
    });
});

describe("what is saved for a Subject Type filter with a preset", () => {
    const fresh = () => ({
        dashboards: {d: [filterRow("f", "Type", subjectTypeSettings(presetST1P1))]},
        subjectTypes: [{...st1}, {...st2}],
        programs: [{...p1}],
    });

    it("does not save a value that is the preset", () => {
        const phone = setUpPhone(fresh());
        save(phone, sel([st1], [p1]));
        assert.deepEqual(phone.savedValues("d"), {});
        assert.isTrue(phone.cache("d").filterApplied);
    });

    it("shows no preset once the preset subject type is deleted, after an apply at the seed", () => {
        const setup = fresh();
        const phone = setUpPhone(setup);
        save(phone, sel([st1], [p1]));
        setup.subjectTypes[0].voided = true;
        assert.isTrue(read(phone).isEmpty());
    });

    it("drops only the program once the preset program is deleted, after an apply at the seed", () => {
        const setup = fresh();
        const phone = setUpPhone(setup);
        save(phone, sel([st1], [p1]));
        setup.programs[0].voided = true;
        assertSeed(read(phone), ["st-1"], []);
    });

    it("still saves a choice beyond the preset", () => {
        const phone = setUpPhone(fresh());
        save(phone, sel([st1], [p1], [{uuid: "e-1", name: "e-1"}]));
        assert.deepEqual(phone.savedValues("d").f, {subjectTypes: ["st-1"], programs: ["p-1"], encounterTypes: ["e-1"]});
    });

    describe("after the upgrade", () => {
        const Hashes = require("jshashes");
        const olderBuildHash = (rows) => new Hashes.MD5().hex(JSON.stringify(rows.map((r) => r.filterConfig)));
        const savedByOlderBuild = (settings) => {
            const rows = [filterRow("f", "Type", settings)];
            const phone = setUpPhone({dashboards: {d: rows}, subjectTypes, programs});
            save(phone, sel([st2]));
            const cache = phone.cache("d");
            cache.dashboardFiltersHash = olderBuildHash(rows);
            cache.reportCardResults.push({reportCard: "c", dashboard: "d"});
            return phone;
        };

        it("resets a dashboard with a preset once", () => {
            const phone = savedByOlderBuild(subjectTypeSettings({presetSubjectTypeUUID: "st-1"}));
            assertSeed(read(phone), ["st-1"], []);
            assert.equal(phone.cache("d").reportCardResults.length, 0);
        });

        it("keeps the saved choice and results of a dashboard without a preset", () => {
            const phone = savedByOlderBuild(subjectTypeSettings());
            assert.deepEqual(uuids(read(phone).subjectTypes), ["st-2"]);
            assert.equal(phone.cache("d").reportCardResults.length, 1);
        });
    });
});
