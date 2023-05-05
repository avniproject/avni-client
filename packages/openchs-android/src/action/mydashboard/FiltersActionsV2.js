import DashboardFilterService from "../../service/reports/DashboardFilterService";
import AddressLevelsState from "../common/AddressLevelsState";
import moment from "moment";
import _ from "lodash";
import {Concept, CustomFilter, ArrayUtil} from 'openchs-models';
import General from "../../utility/General";

// dateMismatchError({minDate, maxDate}) {
//     return moment(minDate).isSameOrBefore(maxDate) ? null : {messageKey: 'startDateGreaterThanEndError'};
// }
//
// dateNotPresentError({minDate, maxDate}) {
//     return (minDate && _.isNil(maxDate)) || (maxDate && _.isNil(minDate)) ? {messageKey: 'bothDateShouldBeSelectedError'} : null;
// }
//
// dateValidationError(dateObject) {
//     return this.dateNotPresentError(dateObject) || this.dateMismatchError(dateObject);
// }

class FiltersActionsV2 {
    static getInitialState() {
        return {
            loading: false,
            filters: [],
            filterConfigs: {},
            selectedValues: {},
            validationResults: {}
        };
    }

    static onLoad(state, action, context) {
        const dashboardService = context.get(DashboardFilterService);
        const filterConfigs = dashboardService.getFilterConfigsForDashboard(action.dashboardUUID);
        const filters = dashboardService.getFilters(action.dashboardUUID);
        return {...state, filterConfigs: filterConfigs, filters: filters, loading: false};
    }

    // minValue: value.replace(/[^0-9.]/g, '')
    static onFilterUpdate(state, action) {
        const {filter, value} = action;
        const {filterConfigs} = state;

        const newState = {...state};
        newState.selectedValues = {...state.selectedValues};

        const inputDataType = filterConfigs[filter.uuid].getInputDataType();
        let updatedValue;
        switch (inputDataType) {
            case Concept.dataType.Subject:
                break;
            case Concept.dataType.Text :
            case Concept.dataType.Notes :
            case Concept.dataType.Id :
                updatedValue = value;
                break;
            case Concept.dataType.Numeric:
            case Concept.dataType.Date:
            case Concept.dataType.DateTime:
            case Concept.dataType.Time:
                updatedValue = filter.widget === CustomFilter.widget.Range ? {...state.value, value} : value;
                break;
            case Concept.dataType.Coded:
                ArrayUtil.toggle(state.value, value);
                updatedValue = state.value;
                break;
        }

        newState.selectedValues[filter.uuid] = updatedValue;
        General.logDebugTemp("FiltersActionsV2",
            `Action Value: ${value}, TypeOfData: ${typeof value}, InputDataType: ${inputDataType}, Updated Value: ${updatedValue}, TypeOfUpdateValue: ${updatedValue}`);
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
