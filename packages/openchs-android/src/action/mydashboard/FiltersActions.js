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
            generalEncounterTypes: [],
            selectedGeneralEncounterTypes: [],
            subjectTypes: [],
            selectedSubjectType: null,
            selectedGenders: []
        };
    }

    static onLoad(state, action, context) {
        const generalEncounterTypes = context.get(FormMappingService).findEncounterTypesForSubjectType(action.selectedSubjectType);
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
            generalEncounterTypes: generalEncounterTypes,
            selectedGeneralEncounterTypes: action.selectedGeneralEncounterTypes,
            subjectTypes: action.subjectTypes,
            selectedSubjectType: action.selectedSubjectType,
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

    static addGeneralVisits(state, action, context) {
        const selected = _.find(state.generalEncounterTypes, e => e.uuid === action.encounterUUID);
        return {
            ...state,
            selectedGeneralEncounterTypes: _.xorBy(state.selectedGeneralEncounterTypes, [selected], 'uuid'),
        };
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

    static addSubjectType(state, action, context) {
        const selectedSubjectType = state.subjectTypes.find(subjectType => subjectType.name === action.subjectTypeName);
        const programs = context.get(FormMappingService).findProgramsForSubjectType(selectedSubjectType);
        const selectedPrograms = programs.length === 1 ? programs : [];
        const encounterTypes = programs.length === 1 ? context.get(FormMappingService).findEncounterTypesForProgram(_.first(programs), selectedSubjectType) : [];
        const generalEncounterTypes = context.get(FormMappingService).findEncounterTypesForSubjectType(selectedSubjectType);
        return {
            ...state,
            selectedSubjectType,
            programs,
            selectedPrograms,
            encounterTypes,
            selectedEncounterTypes: [],
            generalEncounterTypes,
            selectedGeneralEncounterTypes: [],
        }
    }

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

    static customFilterChange(state, action) {
        return {...state, selectedCustomFilters: action.selectedCustomFilters}
    }

    static genderFilterChange(state, action) {
        return {...state, selectedGenders: action.selectedGenders}
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
    ADD_GENERAL_VISITS: `${ActionPrefix}.ADD_GENERAL_VISITS`,
    ADD_PROGRAM: `${ActionPrefix}.ADD_PROGRAM`,
    ADD_SUBJECT_TYPE: `${ActionPrefix}.ADD_SUBJECT_TYPE`,
    CUSTOM_FILTER_CHANGE: `${ActionPrefix}.CUSTOM_FILTER_CHANGE`,
    GENDER_FILTER_CHANGE: `${ActionPrefix}.GENDER_FILTER_CHANGE`,
};
const FilterActionMap = new Map([
    [FilterActionNames.ON_LOAD, FiltersActions.onLoad],
    [FilterActionNames.ADD_FILTER, FiltersActions.addFilter],
    [FilterActionNames.ON_DATE, FiltersActions.onDateChange],
    [FilterActionNames.INDIVIDUAL_SEARCH_ADDRESS_LEVEL, FiltersActions.addressLevelCriteria],
    [FilterActionNames.LOAD_ENCOUNTERS, FiltersActions.loadEncounters],
    [FilterActionNames.ADD_VISITS, FiltersActions.addVisits],
    [FilterActionNames.ADD_GENERAL_VISITS, FiltersActions.addGeneralVisits],
    [FilterActionNames.ADD_PROGRAM, FiltersActions.addProgram],
    [FilterActionNames.ADD_SUBJECT_TYPE, FiltersActions.addSubjectType],
    [FilterActionNames.CUSTOM_FILTER_CHANGE, FiltersActions.customFilterChange],
    [FilterActionNames.GENDER_FILTER_CHANGE, FiltersActions.genderFilterChange],
]);

export {
    FiltersActions, ActionPrefix, FilterActionMap, FilterActionNames
}
