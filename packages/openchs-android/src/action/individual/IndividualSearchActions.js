import IndividualService from "../../service/IndividualService";
import IndividualSearchCriteria from "../../service/query/IndividualSearchCriteria";
import AddressLevelService from "../../service/AddressLevelService";
import EntityService from "../../service/EntityService";
import {SubjectType} from "openchs-models";

export class IndividualSearchActions {
    static clone(state) {
        return {searchCriteria: state.searchCriteria.clone(), subjectTypes:state.subjectTypes.map((subjectType => subjectType.clone()))};
    }

    static onLoad(state, action, context) {
        const newState = IndividualSearchActions.clone(state);
        newState.subjectTypes = context.get(EntityService).getAll(SubjectType.schema.name);
        const subjectType = newState.subjectTypes[0] || SubjectType.create('');
        newState.searchCriteria.addSubjectTypeCriteria(subjectType);
        return newState;
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
        const newState = IndividualSearchActions.clone(state);

        const individualService = beans.get(IndividualService);
        const searchResponse = individualService.search(newState.searchCriteria);
        const individualSearchResults = searchResponse.results;
        const count = searchResponse.count;
        action.cb(individualSearchResults, count);
        return newState;
    };

    static getInitialState(state) {
        return {searchCriteria: IndividualSearchCriteria.empty(), refreshed: false, subjectTypes: []};
    }

    static reset(state) {
        return {...IndividualSearchActions.getInitialState(), key: Math.random()};
    }
}

const individualSearchActions = {
    ON_LOAD: "dc7cdc96-c4d9-41d5-be1d-1c4c1d588801",
    ENTER_NAME_CRITERIA: "ENTER_NAME_CRITERIA",
    ENTER_AGE_CRITERIA: "ENTER_AGE_CRITERIA",
    ENTER_OBS_CRITERIA: "ENTER_OBS_CRITERIA",
    ENTER_VOIDED_CRITERIA: "ENTER_VOIDED_CRITERIA",
    ENTER_SUBJECT_TYPE_CRITERIA: "ENTER_SUBJECT_TYPE_CRITERIA",
    TOGGLE_INDIVIDUAL_SEARCH_ADDRESS_LEVEL: "TOGGLE_INDIVIDUAL_SEARCH_ADDRESS_LEVEL",
    SEARCH_INDIVIDUALS: "SEARCH_INDIVIDUALS",
    RESET: "ISA.RESET"
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
]);

export {
    individualSearchActions as IndividualSearchActionNames,
    individualSearchActionsMap as IndividualSearchActionsMap
};
