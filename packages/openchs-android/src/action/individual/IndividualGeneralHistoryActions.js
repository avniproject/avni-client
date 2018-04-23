import IndividualService from "../../service/IndividualService";
import ProgramService from "../../service/program/ProgramService";

export class IndividualGeneralHistoryActions {
    static getInitialState() {
        return {};
    }

    static loadHistory(state, action, context) {
        return {individual: context.get(IndividualService).findByUUID(action.individualUUID), programsAvailable: context.get(ProgramService).programsAvailable};
    }
}

const actions = {
    LOAD_HISTORY: "IGHA.LOAD_HISTORY"
};

export default new Map([
    [actions.LOAD_HISTORY, IndividualGeneralHistoryActions.loadHistory],
]);

export {actions as Actions};