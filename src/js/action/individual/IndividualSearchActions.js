import Actions from '../../action';
import EntityService from "../../service/EntityService";
import AddressLevel from '../../models/AddressLevel';
import IndividualService from "../../service/IndividualService";

const getAddressLevels = function (state, action, beans) {
    return beans.get(EntityService).getAll(AddressLevel.schema.name);
};

let newStateBasedOnOldState = function (state) {
    return {addressLevels: state.addressLevels, searchCriteria: state.searchCriteria, individualSearchResults: state.individualSearchResults};
};

const enterNameCriteria = function (state, action, beans) {
    var newState = newStateBasedOnOldState(state);
    newState.searchCriteria.name = action.name;
    return newState;
};

const enterAgeCriteria = function (state, action, beans) {
    var newState = newStateBasedOnOldState(state);
    newState.searchCriteria.age = action.age;
    return newState;
};

const startNewIndividualSearch = function (state, action, beans) {
    var newState = newStateBasedOnOldState(state);
    newState.addressLevels = getAddressLevels(state, action, beans);
    return newState;
};

const searchIndividuals = function (state, action, beans) {
    var newState = newStateBasedOnOldState(state);
    newState.individualSearchResults = beans.get(IndividualService).search(state.searchCriteria);
    return newState;
};

export default new Map([[Actions.START_NEW_INDIVIDUAL_SEARCH, startNewIndividualSearch],
    [Actions.ENTER_NAME_CRITERIA, enterNameCriteria],
    [Actions.ENTER_AGE_CRITERIA, enterAgeCriteria],
    [Actions.SEARCH_INDIVIDUALS, searchIndividuals],
]);
