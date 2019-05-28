import AddressLevelService from "../../service/AddressLevelService";
import IndividualSearchCriteria from "../../service/query/IndividualSearchCriteria";
import _ from "lodash";
import FormMappingService from "../../service/FormMappingService";

class FiltersActions {

    static getInitialState() {
        return {
            filters: [],
            locationSearchCriteria: IndividualSearchCriteria.empty(),
            selectedLocations: [],
            filterDate: {value: new Date()},
            programs: [],
            selectedPrograms: [],
            encounterTypes: [],
            selectedEncounterTypes: [],
        };
    }

    static onLoad(state, action, context) {
        return {
            ...state,
            filters: FiltersActions.cloneFilters(action.filters),
            locationSearchCriteria: action.locationSearchCriteria,
            addressLevelState: action.addressLevelState,
            filterDate: {value: action.filterDate.value},
            programs: action.programs,
            selectedPrograms: action.selectedPrograms,
            encounterTypes: action.encounterTypes,
            selectedEncounterTypes: action.selectedEncounterTypes,
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

    static loadEncounters(state, action, context) {
        return {
            ...state,
            encounterTypes: [...state.encounterTypes, ...action.encounters]
        }
    }

    static addVisits(state, action, context) {
        const isPresent = FiltersActions.isPresent(state.selectedEncounterTypes, action.encounterUUID);
        const encounter = FiltersActions.getEncounterByUUID(state.encounterTypes, action.encounterUUID);
        if (isPresent) {
            const selectedEncounterTypes = _.filter(state.selectedEncounterTypes, (encounter) => encounter.uuid !== action.encounterUUID);
            return {
                ...state,
                selectedEncounterTypes
            }
        } else
            return {
                ...state,
                selectedEncounterTypes: [...state.selectedEncounterTypes, ...encounter]
            }
    }

    //todo: vinay evaluate formMappingService usage
    static addProgram(state, action, context) {
        const isPresent = FiltersActions.isPresent(state.selectedPrograms, action.programUUID);
        const program = _.filter(state.programs, (program) => program.uuid === action.programUUID);
        if (isPresent) {
            const selectedPrograms = _.filter(state.selectedPrograms, (program) => program.uuid !== action.programUUID);
            const formMappingService = context.get(FormMappingService);
            const encountersToRemove = formMappingService.findEncounterTypesForProgram({uuid: action.programUUID});
            const encounterTypes = _.differenceBy(state.encounterTypes, encountersToRemove, 'uuid');
            const selectedEncounterTypes = _.differenceBy(state.selectedEncounterTypes, encountersToRemove, 'uuid');
            return {
                ...state,
                selectedPrograms,
                encounterTypes,
                selectedEncounterTypes
            }
        } else
            return {
                ...state,
                selectedPrograms: [...state.selectedPrograms, ...program]
            }
    }

    static isPresent(elements, uuid) {
        return _.filter(elements, (element) => element.uuid === uuid).length > 0;
    }

    static getEncounterByUUID(encounters, uuid) {
        return _.filter(encounters, (encounter) => encounter.uuid === uuid);
    }
}

const ActionPrefix = 'FilterA';
const FilterActionNames = {
    ON_LOAD: `${ActionPrefix}.ON_LOAD`,
    ADD_FILTER: `${ActionPrefix}.ADD_FILTER`,
    ON_DATE: `${ActionPrefix}.ON_DATE`,
    INDIVIDUAL_SEARCH_ADDRESS_LEVEL: `${ActionPrefix}.INDIVIDUAL_SEARCH_ADDRESS_LEVEL`,
    LOAD_ENCOUNTERS: `${ActionPrefix}.LOAD_ENCOUNTERS`,
    ADD_VISITS: `${ActionPrefix}.ADD_VISITS`,
    ADD_PROGRAM: `${ActionPrefix}.ADD_PROGRAM`,
};
const FilterActionMap = new Map([
    [FilterActionNames.ON_LOAD, FiltersActions.onLoad],
    [FilterActionNames.ADD_FILTER, FiltersActions.addFilter],
    [FilterActionNames.ON_DATE, FiltersActions.onDateChange],
    [FilterActionNames.INDIVIDUAL_SEARCH_ADDRESS_LEVEL, FiltersActions.addressLevelCriteria],
    [FilterActionNames.LOAD_ENCOUNTERS, FiltersActions.loadEncounters],
    [FilterActionNames.ADD_VISITS, FiltersActions.addVisits],
    [FilterActionNames.ADD_PROGRAM, FiltersActions.addProgram],
]);

export {
    FiltersActions, ActionPrefix, FilterActionMap, FilterActionNames
}
