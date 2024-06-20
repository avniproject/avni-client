import DashboardFilterService from "../../service/reports/DashboardFilterService";
import _ from "lodash";
import {ArrayUtil, Concept, CustomFilter, DashboardFilterConfig} from 'openchs-models';
import CustomDashboardCacheService from '../../service/CustomDashboardCacheService';

import General from "../../utility/General";
import FormMetaDataSelection from "../../model/FormMetaDataSelection";
import CustomDashboardService from "../../service/customDashboard/CustomDashboardService";

class FiltersActionsV2 {
    static getInitialState() {
        return {
            dashboardUUID: null,
            loading: false,
            filters: [],
            filterErrors: {},
            selectedValues: {},
            filterApplied: false
        };
    }

    static onLoad(state, action, context) {
        const dashboardFilterService = context.get(DashboardFilterService);
        const filterConfigs = dashboardFilterService.getFilterConfigsForDashboard(action.dashboardUUID);
        const filters = dashboardFilterService.getFilters(action.dashboardUUID);
        const {selectedFilterValues, dashboardCache} = context.get(CustomDashboardService).getDashboardData(action.dashboardUUID);
        return {
            ...state,
            filterConfigs: filterConfigs,
            filters: filters,
            loading: false,
            dashboardUUID: action.dashboardUUID,
            filterApplied: dashboardCache.filterApplied,
            selectedValues: selectedFilterValues,
            filterErrors: {}
        };
    }

    static onFilterUpdate(state, action) {
        const {filter, value} = action;
        const {filterConfigs} = state;

        const filterConfig = filterConfigs[filter.uuid];
        const currentFilterValue = state.selectedValues[filter.uuid];
        const inputDataType = filterConfig.getInputDataType();

        const newState = {...state};
        newState.selectedValues = {...state.selectedValues};

        let updatedValue;
        if (inputDataType === DashboardFilterConfig.dataTypes.formMetaData) {
            updatedValue = action.value.clone();
        } else if (inputDataType === Concept.dataType.Coded || filterConfig.type === CustomFilter.type.Gender) {
            updatedValue = _.isNil(currentFilterValue) ? [] : [...currentFilterValue];
            ArrayUtil.toggle(updatedValue, value, (a, b) => a.uuid === b.uuid);
        } else {
            updatedValue = value;
        }

        newState.selectedValues[filter.uuid] = updatedValue;
        return newState;
    }

    static beforeFilterApply(state) {
        return {...state, loading: true};
    }

    static appliedFilter(state, action, context) {
        //Init data
        const {filterConfigs, selectedValues} = state;
        const {navigateToDashboardView} = action;
        const newState = {...state, filterApplied: true, filterErrors: {}};
        Object.keys(selectedValues).forEach((filterUUID) => {
            const filterValue = selectedValues[filterUUID];
            const [success, message] = filterConfigs[filterUUID].validate(filterValue);
            if (!success)
                newState.filterErrors[filterUUID] = message;
        });
        //Check if there are errors in filter values specified
        if (Object.keys(newState.filterErrors).length > 0) {
            newState.filterApplied = false;
            newState.loading = false;
            return newState;
        }
        const customDashboardService = context.get(CustomDashboardService);
        customDashboardService.setSelectedFilterValues(newState.dashboardUUID, selectedValues, true);

        const dashboardFilterService = context.get(DashboardFilterService);
        const ruleInputArray = dashboardFilterService.toRuleInputObjects(newState.dashboardUUID, selectedValues);
        navigateToDashboardView(ruleInputArray);
        return newState;
    }

    static clearFilter(state, action, context) {
        const customDashboardCacheService = context.get(CustomDashboardCacheService);
        customDashboardCacheService.reset(state.dashboardUUID);
        return FiltersActionsV2.onLoad(this.getInitialState(), {dashboardUUID: state.dashboardUUID}, context);
    }
}

const FilterActionPrefix = 'FilterAV2';
const FilterActionNames = {
    ON_LOAD: `${FilterActionPrefix}.ON_LOAD`,
    ON_FILTER_UPDATE: `${FilterActionPrefix}.ON_FILTER_UPDATE`,
    BEFORE_APPLY_FILTER: `${FilterActionPrefix}.BEFORE_APPLY_FILTER`,
    APPLIED_FILTER: `${FilterActionPrefix}.APPLIED_FILTER`,
    CLEAR_FILTER: `${FilterActionPrefix}.CLEAR_FILTER`,
};

const FilterActionMapV2 = new Map([
    [FilterActionNames.ON_LOAD, FiltersActionsV2.onLoad],
    [FilterActionNames.ON_FILTER_UPDATE, FiltersActionsV2.onFilterUpdate],
    [FilterActionNames.BEFORE_APPLY_FILTER, FiltersActionsV2.beforeFilterApply],
    [FilterActionNames.APPLIED_FILTER, FiltersActionsV2.appliedFilter],
    [FilterActionNames.CLEAR_FILTER, FiltersActionsV2.clearFilter],
]);

export {
    FiltersActionsV2, FilterActionPrefix, FilterActionMapV2, FilterActionNames
}
