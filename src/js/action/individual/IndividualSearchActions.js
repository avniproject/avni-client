import Actions from '../../action';
import IndividualService from "../../service/IndividualService";

let newStateBasedOnOldState = function (state) {
    return Object.assign({}, state);
};

const enterNameCriteria = function (state, action, beans) {
    let newState = newStateBasedOnOldState(state);
    newState.searchCriteria.addNameCriteria(action.name);
    return newState;
};

const enterAgeCriteria = function (state, action, beans) {
    let newState = newStateBasedOnOldState(state);
    newState.searchCriteria.addAgeCriteria(action.age);
    return newState;
};

const toggleAddressLevelCriteria = function (state, action, beans) {
    let newState = newStateBasedOnOldState(state);
    newState.searchCriteria.toggleLowestAddress(action.address_level);
    return newState;
};

const searchIndividuals = function (state, action, beans) {
    const individualSearchResults = beans.get(IndividualService).search(state.searchCriteria);
    action.cb(individualSearchResults);
    return Object.assign(state, {});
};

export default new Map([
    [Actions.ENTER_NAME_CRITERIA, enterNameCriteria],
    [Actions.ENTER_AGE_CRITERIA, enterAgeCriteria],
    [Actions.SEARCH_INDIVIDUALS, searchIndividuals],
    [Actions.TOGGLE_INDIVIDUAL_SEARCH_ADDRESS_LEVEL, toggleAddressLevelCriteria],
]);
