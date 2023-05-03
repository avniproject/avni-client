import DashboardFilterService from "../../service/reports/DashboardFilterService";

class FiltersActionsV2 {
    static getInitialState() {
        return {
            loading: false,
            filters: [],
            filterConfigs: {},
            selectedValues: {}
        };
    }

    static onLoad(state, action, context) {
        const dashboardService = context.get(DashboardFilterService);
        const filterConfigs = dashboardService.getFilterConfigsForDashboard(action.dashboardUUID);
        const filters = dashboardService.getFilters(action.dashboardUUID);
        return {...state, filterConfigs: filterConfigs, filters: filters, loading: false};
    }

    static onFilterUpdate(state, action) {
        const {filter, value} = action;
        const newState = {...state};
        newState.selectedValues[filter.uuid] = value;
        return newState;
    }

    static beforeFilterApply(state) {
        return {...state, loading: true};
    }

    static appliedFilter(state) {
        return {...state};
    }
}

const FilterActionPrefix = 'FilterAV2';
const FilterActionNames = {
    ON_LOAD: `${FilterActionPrefix}.ON_LOAD`,
    ON_FILTER_UPDATE: `${FilterActionPrefix}.ON_FILTER_UPDATE`,
    BEFORE_APPLY_FILTER: `${FilterActionPrefix}.BEFORE_APPLY_FILTER`,
    APPLIED_FILTER: `${FilterActionPrefix}.APPLIED_FILTER`
};

const FilterActionMapV2 = new Map([
    [FilterActionNames.ON_LOAD, FiltersActionsV2.onLoad],
    [FilterActionNames.ON_FILTER_UPDATE, FiltersActionsV2.onFilterUpdate],
    [FilterActionNames.BEFORE_APPLY_FILTER, FiltersActionsV2.beforeFilterApply],
    [FilterActionNames.APPLIED_FILTER, FiltersActionsV2.appliedFilter],
]);

export {
    FiltersActionsV2, FilterActionPrefix, FilterActionMapV2, FilterActionNames
}
