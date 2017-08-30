import IndividualService from "../../service/IndividualService";

class IndividualRegistrationDetailsActions {
    static getInitialState() {
        return {};
    }

    static onLoad(state, action, context) {
        const individual = context.get(IndividualService).findByUUID(action.individualUUID);
        return {individual: individual};
    }
}

const IndividualRegistrationDetailsActionsNames = {
    ON_LOAD: 'IRDA.ON_LOAD'
};

const IndividualRegistrationDetailsActionsMap = new Map([
    [IndividualRegistrationDetailsActionsNames.ON_LOAD, IndividualRegistrationDetailsActions.onLoad],
]);

export {
    IndividualRegistrationDetailsActionsNames,
    IndividualRegistrationDetailsActionsMap,
    IndividualRegistrationDetailsActions
};