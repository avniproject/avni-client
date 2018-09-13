import IndividualService from "../../service/IndividualService";
import IndividualSearchCriteria from "../../service/query/IndividualSearchCriteria";
import AddressLevelService from "../../service/AddressLevelService";

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

    static enterVoidedCriteria = function (state, action, beans) {
        const newState = IndividualSearchActions.clone(state);
        newState.searchCriteria.addVoidedCriteria(action.value);
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
        const individualSearchResults = beans.get(IndividualService).search(newState.searchCriteria);
        action.cb(individualSearchResults);
        return newState;
    };

    static getInitialState(state) {
        return {searchCriteria: IndividualSearchCriteria.empty(), refreshed: false};
    }

    static reset(state) {
        return {...IndividualSearchActions.getInitialState(), key: Math.random()};
    }
}

const individualSearchActions = {
    ENTER_NAME_CRITERIA: "ENTER_NAME_CRITERIA",
    ENTER_AGE_CRITERIA: "ENTER_AGE_CRITERIA",
    ENTER_OBS_CRITERIA: "ENTER_OBS_CRITERIA",
    ENTER_VOIDED_CRITERIA: "ENTER_VOIDED_CRITERIA",
    TOGGLE_INDIVIDUAL_SEARCH_ADDRESS_LEVEL: "TOGGLE_INDIVIDUAL_SEARCH_ADDRESS_LEVEL",
    SEARCH_INDIVIDUALS: "SEARCH_INDIVIDUALS",
    RESET: "ISA.RESET"
};

const individualSearchActionsMap = new Map([
    [individualSearchActions.ENTER_NAME_CRITERIA, IndividualSearchActions.enterNameCriteria],
    [individualSearchActions.ENTER_AGE_CRITERIA, IndividualSearchActions.enterAgeCriteria],
    [individualSearchActions.ENTER_OBS_CRITERIA, IndividualSearchActions.enterObsCriteria],
    [individualSearchActions.ENTER_VOIDED_CRITERIA, IndividualSearchActions.enterVoidedCriteria],
    [individualSearchActions.SEARCH_INDIVIDUALS, IndividualSearchActions.searchIndividuals],
    [individualSearchActions.TOGGLE_INDIVIDUAL_SEARCH_ADDRESS_LEVEL, IndividualSearchActions.toggleAddressLevelCriteria],
    [individualSearchActions.RESET, IndividualSearchActions.reset]
]);

export {
    individualSearchActions as IndividualSearchActionNames,
    individualSearchActionsMap as IndividualSearchActionsMap
};