import {FiltersActionsV2} from "../../../src/action/mydashboard/FiltersActionsV2";
import TestContext from "../views/testframework/TestContext";
import {CustomFilter} from 'openchs-models';
import TestDashboardFilterConfigFactory from "../../model/TestDashboardFilterConfigFactory";
import TestDashboardFilterFactory from "../../model/TestDashboardFilterFactory";
import {assert} from 'chai';

it('should update and apply date range filter', function () {
    let state = FiltersActionsV2.getInitialState();
    const dashboardFilterConfig = TestDashboardFilterConfigFactory.create({type: CustomFilter.type.RegistrationDate, widget: CustomFilter.widget.Range});
    const dashboardFilter = TestDashboardFilterFactory.create({filterConfig: dashboardFilterConfig, uuid: "df1"});
    const capturedData = {};
    const testContext = new TestContext({filters: {"d": [dashboardFilter]}}, capturedData);
    const today = new Date();

    state = FiltersActionsV2.onLoad(state, {dashboardUUID: "d"}, testContext);
    state = FiltersActionsV2.onFilterUpdate(state, {filter: dashboardFilter, value: {minValue: today}});
    state = FiltersActionsV2.onFilterUpdate(state, {filter: dashboardFilter, value: {maxValue: today}});
    FiltersActionsV2.appliedFilter(state, {navigateToDashboardView: _.noop, setFiltersDataOnDashboardView: _.noop}, testContext);

    assert.equal(_.isNil(capturedData.ruleInputFileConfig), false);
    assert.equal(_.isNil(capturedData.ruleInputFilterValue), false);
});
