import IndividualService from "../../service/IndividualService";
import IndividualSearchCriteria from "../../service/query/IndividualSearchCriteria";

export class IndividualSearchActions {
    static clone(state) {
        return {searchCriteria: state.searchCriteria.clone()};
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

    static toggleAddressLevelCriteria(state, action, beans) {
        const newState = IndividualSearchActions.clone(state);
        newState.searchCriteria.toggleLowestAddress(action.value);
        return newState;
    };

    static searchIndividuals(state, action, beans) {
        const newState = IndividualSearchActions.clone(state);
        const individualSearchResults = beans.get(IndividualService).search(newState.searchCriteria);
        action.cb(individualSearchResults);
        return newState;
    };

    static getInitialState(context) {
        return {searchCriteria: IndividualSearchCriteria.empty()};
    }
}

const individualSearchActions = {
    ENTER_NAME_CRITERIA: "ENTER_NAME_CRITERIA",
    ENTER_AGE_CRITERIA: "ENTER_AGE_CRITERIA",
    ENTER_OBS_CRITERIA: "ENTER_OBS_CRITERIA",
    TOGGLE_INDIVIDUAL_SEARCH_ADDRESS_LEVEL: "TOGGLE_INDIVIDUAL_SEARCH_ADDRESS_LEVEL",
    SEARCH_INDIVIDUALS: "SEARCH_INDIVIDUALS"
};

const individualSearchActionsMap = new Map([
    [individualSearchActions.ENTER_NAME_CRITERIA, IndividualSearchActions.enterNameCriteria],
    [individualSearchActions.ENTER_AGE_CRITERIA, IndividualSearchActions.enterAgeCriteria],
    [individualSearchActions.ENTER_OBS_CRITERIA, IndividualSearchActions.enterObsCriteria],
    [individualSearchActions.SEARCH_INDIVIDUALS, IndividualSearchActions.searchIndividuals],
    [individualSearchActions.TOGGLE_INDIVIDUAL_SEARCH_ADDRESS_LEVEL, IndividualSearchActions.toggleAddressLevelCriteria]
]);

export {
    individualSearchActions as IndividualSearchActionNames,
    individualSearchActionsMap as IndividualSearchActionsMap
};