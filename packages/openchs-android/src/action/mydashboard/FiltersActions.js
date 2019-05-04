import AddressLevelService from "../../service/AddressLevelService";
import IndividualSearchCriteria from "../../service/query/IndividualSearchCriteria";

class FiltersActions {

    static getInitialState() {
        return {
            filters: [],
            locationSearchCriteria: IndividualSearchCriteria.empty(),
            selectedLocations: [],
            filterDate: {value: new Date()}
        };
    }

    static onLoad(state, action, context) {
        return {
            ...state,
            filters: FiltersActions.cloneFilters(action.filters),
            locationSearchCriteria: action.locationSearchCriteria,
            addressLevelState: action.addressLevelState,
            filterDate: {value: action.filterDate.value},
        }
    }

    static addFilter(state, action, context) {
        const newFilters = FiltersActions.cloneFilters(state.filters.set(action.filter.label, action.filter));
        return {...state, filters: newFilters};
    }

    static cloneFilters(filters) {
        return [...filters.entries()].reduce((acc, [l, f]) => acc.set(l, f.clone()), new Map());
    }

    static addressLevelCriteria(state, action, beans) {
        const newState = {
            ...state,
            locationSearchCriteria: state.locationSearchCriteria.clone(),
            addressLevelState: action.addressLevelState
        };
        const addressLevelService = beans.get(AddressLevelService);
        const lowestSelectedAddressLevels = action.addressLevelState.lowestSelectedAddresses;
        const lowestAddressLevels = lowestSelectedAddressLevels
            .reduce((acc, parent) => acc.concat(addressLevelService.getLeavesOfParent(parent)), []);
        newState.locationSearchCriteria.toggleLowestAddresses(lowestAddressLevels);
        return newState;
    }

    static onDateChange(state, action) {
        return {...state, filterDate: {value: action.value}};
    }
}

const ActionPrefix = 'FilterA';
const FilterActionNames = {
    ON_LOAD: `${ActionPrefix}.ON_LOAD`,
    ADD_FILTER: `${ActionPrefix}.ADD_FILTER`,
    ON_DATE: `${ActionPrefix}.ON_DATE`,
    INDIVIDUAL_SEARCH_ADDRESS_LEVEL: `${ActionPrefix}.INDIVIDUAL_SEARCH_ADDRESS_LEVEL`,
};
const FilterActionMap = new Map([
    [FilterActionNames.ON_LOAD, FiltersActions.onLoad],
    [FilterActionNames.ADD_FILTER, FiltersActions.addFilter],
    [FilterActionNames.ON_DATE, FiltersActions.onDateChange],
    [FilterActionNames.INDIVIDUAL_SEARCH_ADDRESS_LEVEL, FiltersActions.addressLevelCriteria],
]);

export {
    FiltersActions, ActionPrefix, FilterActionMap, FilterActionNames
}
