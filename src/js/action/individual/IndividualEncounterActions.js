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

}

const actions = {
    TOGGLE_MULTISELECT_ANSWER: "TOGGLE_MULTISELECT_ANSWER"
};

const individualEncounterActions = new IndividualEncounterActions();

export default new Map([
    [actions.TOGGLE_MULTISELECT_ANSWER, individualEncounterActions.toggleMultiSelectAnswer]
]);

export {actions as Actions};
