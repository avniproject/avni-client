import G from "../../utility/General";
import RuleEvaluationService from "../../service/RuleEvaluationService";
import EntityService from "../../service/EntityService";
import Encounter from "../../models/Encounter";

export class EncounterRecommendationActions {
    static getInitialState() {
        return {};
    }

    static onLoad(state, action, context) {
        return G.setNewState(state, function(newState) {
        });
    }
}

const actions = {
    ON_LOAD: '712ed9e2-986f-4342-8116-00350f427b0b'
};

export default new Map([
    [actions.ON_LOAD, EncounterRecommendationActions.onLoad],
]);

export {actions as Actions};