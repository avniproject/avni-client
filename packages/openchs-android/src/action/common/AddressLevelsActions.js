import AddressLevelsState from './AddressLevelsState';
import AddressLevelService from "../../service/AddressLevelService";

class AddressLevelsActions {
    static getInitialState() {
        return {data: new AddressLevelsState()};
    }

    static _defaultState(state, action, context) {
        const addressLevelService = context.get(AddressLevelService);
        const highestAddressLevels = addressLevelService.highestLevel();
        return new AddressLevelsState(highestAddressLevels);
    }

    static onLoad(state, action, context) {
        return {data: AddressLevelsActions._defaultState(state, action, context)};

    }

    static selectAddressLevel(state, action, context) {
        const addressLevelService = context.get(AddressLevelService);
        const addressLevelsState = state.data.selectLevel(action.levelType, action.selectedLevel, action.exclusive);
        const selectedLevels = addressLevelsState.selectedAddresses;
        let data = selectedLevels
            .reduce((finalState, l) => finalState.addLevels(addressLevelService.getChildrenParent(l.uuid)),
                new AddressLevelsState(selectedLevels))
            .defaultTo(AddressLevelsActions._defaultState(state, action, context));
        let onLowest = !_.isEmpty(data.lowestSelectedAddresses)
            && addressLevelService.minLevel() === data.lowestSelectedAddresses[0].level;
        return {
            data: data,
            onLowest: onLowest
        };
    }

}

const actions = {
    ON_LOAD: "AL.ON_LOAD",
    ON_SELECT: "AL.ON_LEVEL_SELECT"
};

const actionMap = new Map([
    [actions.ON_LOAD, AddressLevelsActions.onLoad],
    [actions.ON_SELECT, AddressLevelsActions.selectAddressLevel],
]);

export {actions as Actions, actionMap as AddressLevelActionMap, AddressLevelsActions};