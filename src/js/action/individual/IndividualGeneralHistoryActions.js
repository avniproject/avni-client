import IndividualEncounterService from "../../service/IndividualEncounterService";
import _ from "lodash";

export class IndividualGeneralHistoryActions {
    static clone(state) {
        const newState = {};
        newState.encounters = state.encounters;
        return newState;
    }

    static loadHistory(state, action, context) {
        const newState = IndividualGeneralHistoryActions.clone(state);
        newState.encounters = context.get(IndividualEncounterService).getEncounters(action.individual);
        return newState;
    }

    static getInitialState() {
        return {
            encounters: []
        };
    }
}

const actions = {
    LOAD_HISTORY: "IGHA.LOAD_HISTORY"
};

export default new Map([
    [actions.LOAD_HISTORY, IndividualGeneralHistoryActions.loadHistory],
]);

export {actions as Actions};