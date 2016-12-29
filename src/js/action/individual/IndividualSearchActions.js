import Actions from '../../action';
import EntityService from "../../service/EntityService";
import AddressLevel from '../../models/AddressLevel';
import IndividualService from "../../service/IndividualService";

const getAddressLevels = function (state, action, beans) {
    return beans.get(EntityService).getAll(AddressLevel.schema.name);
};

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

const addAddressLevelCriteria = function (state, action, beans) {
    let newState = newStateBasedOnOldState(state);
    newState.searchCriteria.addLowestAddress(action.address_level);
    return newState;
};

const removeAddressLevelCriteria = function (state, action, beans) {
    let newState = newStateBasedOnOldState(state);
    newState.searchCriteria.removeLowestAddress(action.address_level);
    return newState;
};

const startNewIndividualSearch = function (state, action, beans) {
    let newState = newStateBasedOnOldState(state);
    newState.addressLevels = getAddressLevels(state, action, beans);
    return newState;
};

const searchIndividuals = function (state, action, beans) {
    const individualSearchResults = beans.get(IndividualService).search(state.searchCriteria);
    action.cb(individualSearchResults);
    return Object.assign(state, {});
};

export default new Map([[Actions.START_NEW_INDIVIDUAL_SEARCH, startNewIndividualSearch],
    [Actions.ENTER_NAME_CRITERIA, enterNameCriteria],
    [Actions.ENTER_AGE_CRITERIA, enterAgeCriteria],
    [Actions.SEARCH_INDIVIDUALS, searchIndividuals],
    [Actions.ADD_ADDRESS_LEVEL_CRITERIA, addAddressLevelCriteria],
    [Actions.REMOVE_ADDRESS_LEVEL_CRITERIA, removeAddressLevelCriteria]

]);
