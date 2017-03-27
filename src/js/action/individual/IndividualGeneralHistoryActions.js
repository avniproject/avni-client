import IndividualService from "../../service/IndividualService";

export class IndividualGeneralHistoryActions {
    static getInitialState() {
        return {};
    }

    static loadHistory(state, action, context) {
        return {individual: context.get(IndividualService).findByUUID(action.individualUUID)};
    }
}

const actions = {
    LOAD_HISTORY: "IGHA.LOAD_HISTORY"
};

export default new Map([
    [actions.LOAD_HISTORY, IndividualGeneralHistoryActions.loadHistory],
]);

export {actions as Actions};