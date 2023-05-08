import DashboardFilterService from "../../service/reports/DashboardFilterService";
import _ from "lodash";
import {ArrayUtil, Concept, CustomFilter, ModelGeneral} from 'openchs-models';

class FiltersActionsV2 {
    static getInitialState() {
        return {
            loading: false,
            filters: [],
            filterConfigs: {},
            filterErrors: {},
            selectedValues: {},
            filterApplied: false
        };
    }

    static onLoad(state, action, context) {
        const dashboardFilterService = context.get(DashboardFilterService);
        const filterConfigs = dashboardFilterService.getFilterConfigsForDashboard(action.dashboardUUID);
        const filters = dashboardFilterService.getFilters(action.dashboardUUID);
        return {...state, filterConfigs: filterConfigs, filters: filters, loading: false, filterApplied: false};
    }

    // minValue: value.replace(/[^0-9.]/g, '')
    static onFilterUpdate(state, action) {
        const {filter, value} = action;
        const {filterConfigs} = state;

        const filterConfig = filterConfigs[filter.uuid];
        const inputDataType = filterConfig.getInputDataType();
        const currentFilterValue = state.selectedValues[filter.uuid];
        const isRange = filterConfig.widget === CustomFilter.widget.Range;

        const newState = {...state};
        newState.selectedValues = {...state.selectedValues};
        let updatedValue;
        switch (inputDataType) {
            case Concept.dataType.Coded:
            case CustomFilter.type.Gender:
                updatedValue = _.isNil(currentFilterValue) ? [] : [...currentFilterValue];
                ArrayUtil.toggle(updatedValue, value, (a, b) => a.uuid === b.uuid);
                break;

            case CustomFilter.type.Address:
            case Concept.dataType.Subject:
            case Concept.dataType.Text :
            case Concept.dataType.Notes :
            case Concept.dataType.Id :
                updatedValue = value;
                break;

            case Concept.dataType.Numeric:
            case Concept.dataType.Date:
            case Concept.dataType.DateTime:
            case Concept.dataType.Time:
                updatedValue = isRange ? {...currentFilterValue, ...value} : value;
                break;
        }

        newState.selectedValues[filter.uuid] = updatedValue;
        return newState;
    }

    static beforeFilterApply(state) {
        return {...state, loading: true};
    }

    static appliedFilter(state, action, context) {
        const {filterConfigs, selectedValues} = state;
        const {navigateToDashboardView} = action;
        const newState = {...state};

        newState.filterErrors = {};
        const filledFilterValues = _.filter(Object.entries(selectedValues), ([, filterValue]) => !ModelGeneral.isDeepEmpty(filterValue));

        filledFilterValues.forEach(([filterUUID, filterValue]) => {
            const [success, message] = filterConfigs[filterUUID].validate(filterValue);
            if (!success)
                newState.filterErrors[filterUUID] = message;
        });
        if (Object.keys(newState.filterErrors).length > 0) {
            return newState;
        }

        const dashboardFilterService = context.get(DashboardFilterService);
        const ruleInput = filledFilterValues
            .map(([filterUUID, filterValue]) => dashboardFilterService.toRuleInputObject(filterConfigs[filterUUID], filterValue));

        navigateToDashboardView(ruleInput);
        return newState;
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
