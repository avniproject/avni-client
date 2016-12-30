import Actions from '../../action';

const toggleIndividualRegisterAddressLevel = function (state, action, beans) {
    let newState = Object.assign({}, state);
    newState.individual.lowestAddressLevel = action.address_level;
    return newState;
};

export default new Map([
    [Actions.TOGGLE_INDIVIDUAL_REGISTER_ADDRESS_LEVEL, toggleIndividualRegisterAddressLevel],
]);
