class IndividualEncounterActions {
    static _setValue(state, setter) {
        let newState = Object.assign({}, state);
        setter(newState);
        return newState;
    }

    toggleMultiSelectAnswer(state, action) {
        return IndividualEncounterActions._setValue(state, (newState) => {
            newState.encounter.toggleMultiSelectAnswer(action.concept, action.answerUUID);
        });
    }

    toggleSingleSelectAnswer(state, action) {
        return IndividualEncounterActions._setValue(state, (newState) => {
            newState.encounter.toggleSingleSelectAnswer(action.concept, action.answerUUID);
        });
    }

}

const actions = {
    TOGGLE_MULTISELECT_ANSWER: "TOGGLE_MULTISELECT_ANSWER",
    TOGGLE_SINGLESELECT_ANSWER: "TOGGLE_SINGLESELECT_ANSWER"
};

const individualEncounterActions = new IndividualEncounterActions();

export default new Map([
    [actions.TOGGLE_MULTISELECT_ANSWER, individualEncounterActions.toggleMultiSelectAnswer],
    [actions.TOGGLE_SINGLESELECT_ANSWER, individualEncounterActions.toggleSingleSelectAnswer]

]);

export {actions as Actions};
