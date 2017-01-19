import G from '../../utility/General';
import IndividualEncounterService from "../../service/IndividualEncounterService";
import _ from "lodash";

export class IndividualGeneralHistoryActions {
    static loadHistory(state, individual, context) {
        return G.setNewState(state, function(newState) {
            newState.encounters = context.get(IndividualEncounterService).getEncounters(individual);
            newState.encounters = _.isNil(newState.encounters) ? [] : newState.encounters;
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