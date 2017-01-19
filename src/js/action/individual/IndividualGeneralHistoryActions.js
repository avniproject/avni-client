import IndividualEncounterService from "../../service/IndividualEncounterService";

export class IndividualGeneralHistoryActions {
    static loadHistory(state, individual, context) {
        return G.setNewState(state, function(newState) {
            newState.encounters = context.get(IndividualEncounterService).getEncounters(individual);
        });
    }

    static getInitialState() {
        return {
            encounters: []
        };
    }
}

const actions = {
    LOAD_HISTORY: "e9cbea12-1720-46e1-bec8-deceeeaea9d8"
};

export default new Map([
    [actions.LOAD_HISTORY, IndividualGeneralHistoryActions.loadHistory],
]);

export {actions as Actions};