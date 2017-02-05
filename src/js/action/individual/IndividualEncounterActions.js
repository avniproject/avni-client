import IndividualEncounterService from "../../service/IndividualEncounterService";
import EntityService from "../../service/EntityService";
import Form from "../../models/application/Form";

export class IndividualEncounterActions {
    static toggleMultiSelectAnswer(state, action) {
        state.encounter.toggleMultiSelectAnswer(action.concept, action.answerUUID);
        return state;
    }

    static toggleSingleSelectAnswer(state, action) {
        state.encounter.toggleSingleSelectAnswer(action.concept, action.answerUUID);
        return state;
    }

    static onLoad(state, individual, context) {
        state.encounter = context.get(IndividualEncounterService).newEncounter(individual);
        state.form = context.get(EntityService).findByKey('formType', Form.formTypes.Encounter, Form.schema.name);
        return state;
    }

    static getInitialState(context) {
        return {
            encounter: null, form: null
        };
    }
}

const actions = {
    TOGGLE_MULTISELECT_ANSWER: "c5407cf4-f37a-4568-9d56-ffba58a3bafe",
    TOGGLE_SINGLESELECT_ANSWER: "6840941d-1f74-43ff-bd20-161e580abdc8",
    ON_LOAD: "2bbad779-cbba-4778-a9c7-7da6a0b36a96"
};

export default new Map([
    [actions.TOGGLE_MULTISELECT_ANSWER, IndividualEncounterActions.toggleMultiSelectAnswer],
    [actions.TOGGLE_SINGLESELECT_ANSWER, IndividualEncounterActions.toggleSingleSelectAnswer],
    [actions.ON_LOAD, IndividualEncounterActions.onLoad]
]);

export {actions as Actions};
