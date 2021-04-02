import IndividualService from "../../service/IndividualService";
import IndividualSearchCriteria from "../../service/query/IndividualSearchCriteria";
import AddressLevelService from "../../service/AddressLevelService";
import EntityService from "../../service/EntityService";
import {SubjectType, Privilege} from "avni-models";
import CustomFilterService from "../../service/CustomFilterService";
import _ from "lodash";
import PrivilegeService from "../../service/PrivilegeService";
import {firebaseEvents, logEvent} from "../../utility/Analytics";

export class IndividualSearchActions {
    static clone(state) {
        return {
            searchCriteria: state.searchCriteria.clone(),
            subjectTypes: state.subjectTypes.map((subjectType => subjectType.clone())),
            selectedCustomFilters: {...state.selectedCustomFilters},
            genders: {...state.genders}
        };
    }

    static onLoad(state, action, context) {
        const newState = IndividualSearchActions.clone(state);
        const viewSubjectCriteria = `privilege.name = '${Privilege.privilegeName.viewSubject}' AND privilege.entityType = '${Privilege.privilegeEntityType.subject}'`;
        const privilegeService = context.get(PrivilegeService);
        const allowedSubjectTypeUUIDs = privilegeService.allowedEntityTypeUUIDListForCriteria(viewSubjectCriteria, 'subjectTypeUuid');
        newState.subjectTypes = !_.isNil(action.memberSubjectType) ? [action.memberSubjectType] :
            _.filter(context.get(EntityService).findAllByCriteria('voided = false', SubjectType.schema.name), subjectType => !privilegeService.hasEverSyncedGroupPrivileges() || privilegeService.hasAllPrivileges() || _.includes(allowedSubjectTypeUUIDs, subjectType.uuid));
        const subjectType = newState.subjectTypes[0] || SubjectType.create('');
        newState.searchCriteria.addSubjectTypeCriteria(subjectType);
        if (action.allowedSubjectUUIDs && action.allowedSubjectUUIDs.length > 0) {
            newState.searchCriteria.addAllowedSubjectUUIDsCriteria(action.allowedSubjectUUIDs);
            newState.allowedSubjectUUIDs = action.allowedSubjectUUIDs;
        }
        return {...newState, loading: false};
    }

    static enterNameCriteria(state, action, beans) {
        const newState = IndividualSearchActions.clone(state);
        newState.searchCriteria.addNameCriteria(action.value);
        return newState;
    };

    static enterAgeCriteria = function (state, action, beans) {
        const newState = IndividualSearchActions.clone(state);
        newState.searchCriteria.addAgeCriteria(action.value);
        return newState;
    };

    static enterObsCriteria = function (state, action, beans) {
        const newState = IndividualSearchActions.clone(state);
        newState.searchCriteria.addObsCriteria(action.value);
        return newState;
    };

    static enterVoidedCriteria = function (state, action, beans) {
        const newState = IndividualSearchActions.clone(state);
        newState.searchCriteria.addVoidedCriteria(action.value);
        return newState;
    };

    static enterSubjectTypeCriteria = function (state, action, beans) {
        const newState = IndividualSearchActions.clone(state);
        const selectedSubjectType = newState.subjectTypes.find(
            (subjectType) => subjectType.name === action.subjectType);
        newState.searchCriteria.addSubjectTypeCriteria(selectedSubjectType);
        return newState;
    };

    static toggleAddressLevelCriteria(state, action, beans) {
        const newState = IndividualSearchActions.clone(state);
        const addressLevelService = beans.get(AddressLevelService);
        const lowestSelectedAddressLevels = action.values;
        const lowestAddressLevels = lowestSelectedAddressLevels
            .reduce((acc, parent) => acc.concat(addressLevelService.getLeavesOfParent(parent)), []);
        newState.searchCriteria.toggleLowestAddresses(lowestAddressLevels);
        return newState;
    };

    static searchIndividuals(state, action, beans) {
        const startTime = Date.now();
        const newState = IndividualSearchActions.clone(state);
        newState.searchCriteria.addGenderCriteria(state.selectedGenders);
        newState.searchCriteria.addCustomFilters(state.selectedCustomFilters);

        const individualService = beans.get(IndividualService);
        const customFilterService = beans.get(CustomFilterService);
        const selectedCustomFilterForSubjectType = _.mapValues(newState.searchCriteria.selectedCustomFilters, selectedFilters => {
            const s = selectedFilters.filter(filter => filter.subjectTypeUUID === state.searchCriteria.subjectType.uuid);
            return s.length === 0 ? [] : s
        });
        const searchFilterTypes = IndividualSearchActions.getSearchFilterTypes(newState, selectedCustomFilterForSubjectType);
        if (customFilterService.isSearchFiltersEmpty(selectedCustomFilterForSubjectType)) {
            const searchResponse = individualService.search(newState.searchCriteria);
            logEvent(firebaseEvents.SEARCH_FILTER, {
                time_taken: Date.now() - startTime,
                applied_filters: searchFilterTypes
            });
            action.cb(searchResponse, searchResponse.length);
            return newState;
        }
        const individualUUIDs = customFilterService.applyCustomFilters(selectedCustomFilterForSubjectType, 'searchFilters');
        const searchResponse = _.isEmpty(individualUUIDs) ? [] :
            individualService.search(newState.searchCriteria).filter(i => _.includes(individualUUIDs, i.uuid));
        logEvent(firebaseEvents.SEARCH_FILTER, {
            time_taken: Date.now() - startTime,
            applied_filters: searchFilterTypes
        });
        action.cb(searchResponse, searchResponse.length);
        return newState;
    };

    static getSearchFilterTypes(state, selectedCustomFilterForSubjectType) {
        const propertiesToRemove = ['includeVoided', 'subjectType', 'allowedSubjectUUIDs', 'selectedCustomFilters'];
        const allFilters = {..._.omit(state.searchCriteria, propertiesToRemove), ...selectedCustomFilterForSubjectType};
        return _.chain(allFilters)
            .pickBy((v, k) => !_.isEmpty(v))
            .keys()
            .join(', ')
            .value();
    }

    static getInitialState(state) {
        return {searchCriteria: IndividualSearchCriteria.empty(), refreshed: false, subjectTypes: []};
    }

    static reset(state) {
        return {...IndividualSearchActions.getInitialState(), key: Math.random()};
    }

    static customFilterChange(state, action) {
        return {...state, selectedCustomFilters: action.selectedCustomFilters}
    }

    static genderChange(state, action) {
        return {...state, selectedGenders: action.selectedGenders};
    }

    static loadIndicator(state, action) {
        return {...state, loading: action.status};
    }
}

const ActionPrefix = 'IndSearch';
const individualSearchActions = {
    ON_LOAD: "dc7cdc96-c4d9-41d5-be1d-1c4c1d588801",
    ENTER_NAME_CRITERIA: "ENTER_NAME_CRITERIA",
    ENTER_AGE_CRITERIA: "ENTER_AGE_CRITERIA",
    ENTER_OBS_CRITERIA: "ENTER_OBS_CRITERIA",
    ENTER_VOIDED_CRITERIA: "ENTER_VOIDED_CRITERIA",
    ENTER_SUBJECT_TYPE_CRITERIA: "ENTER_SUBJECT_TYPE_CRITERIA",
    TOGGLE_INDIVIDUAL_SEARCH_ADDRESS_LEVEL: "TOGGLE_INDIVIDUAL_SEARCH_ADDRESS_LEVEL",
    SEARCH_INDIVIDUALS: "SEARCH_INDIVIDUALS",
    RESET: "ISA.RESET",
    CUSTOM_FILTER_CHANGE: `${ActionPrefix}.CUSTOM_FILTER_CHANGE`,
    GENDER_CHANGE: `${ActionPrefix}.GENDER_CHANGE`,
    LOAD_INDICATOR: `${ActionPrefix}.LOAD_INDICATOR`,
};

const individualSearchActionsMap = new Map([
    [individualSearchActions.ENTER_NAME_CRITERIA, IndividualSearchActions.enterNameCriteria],
    [individualSearchActions.ENTER_AGE_CRITERIA, IndividualSearchActions.enterAgeCriteria],
    [individualSearchActions.ENTER_OBS_CRITERIA, IndividualSearchActions.enterObsCriteria],
    [individualSearchActions.ENTER_VOIDED_CRITERIA, IndividualSearchActions.enterVoidedCriteria],
    [individualSearchActions.ENTER_SUBJECT_TYPE_CRITERIA, IndividualSearchActions.enterSubjectTypeCriteria],
    [individualSearchActions.SEARCH_INDIVIDUALS, IndividualSearchActions.searchIndividuals],
    [individualSearchActions.TOGGLE_INDIVIDUAL_SEARCH_ADDRESS_LEVEL, IndividualSearchActions.toggleAddressLevelCriteria],
    [individualSearchActions.RESET, IndividualSearchActions.reset],
    [individualSearchActions.ON_LOAD, IndividualSearchActions.onLoad],
    [individualSearchActions.CUSTOM_FILTER_CHANGE, IndividualSearchActions.customFilterChange],
    [individualSearchActions.GENDER_CHANGE, IndividualSearchActions.genderChange],
    [individualSearchActions.LOAD_INDICATOR, IndividualSearchActions.loadIndicator],
]);

export {
    individualSearchActions as IndividualSearchActionNames,
    individualSearchActionsMap as IndividualSearchActionsMap
};
