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
        const addressLevelState = AddressLevelsActions._defaultState(state, action, context);
        if (_.isNil(action.selectedLowestLevel)) {
            return {data: addressLevelState};
        }
        const lowestSelectedLevel = action.selectedLowestLevel;
        const addressLevelService = context.get(AddressLevelService);
        const parentList = addressLevelService.getParentsOfLeaf(lowestSelectedLevel).concat([lowestSelectedLevel]);
        return parentList.reduce((acc, parent) =>
            AddressLevelsActions.selectAddressLevel(acc,
                {
                    levelType: parent.type,
                    selectedLevel: parent.uuid,
                    exclusive: true
                }, context), {data: addressLevelState});
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
    ON_SELECT: "AL.ON_LEVEL_SELECT",
    RESET: "AL.RESET"
};

const actionMap = new Map([
    [actions.ON_LOAD, AddressLevelsActions.onLoad],
    [actions.RESET, AddressLevelsActions.onLoad],
    [actions.ON_SELECT, AddressLevelsActions.selectAddressLevel],
]);

export {actions as Actions, actionMap as AddressLevelActionMap, AddressLevelsActions};