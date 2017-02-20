import _ from "lodash";

class ObservationsHolderActions {
    static onPrimitiveObs(state, action, context) {
        const newState = state.clone();
        const validationResult = action.formElement.validate(action.value);
        newState.handleValidationResult(validationResult);
        newState.encounter.addOrUpdatePrimitiveObs(action.formElement.concept, action.value);
        return newState;
    }

    static toggleMultiSelectAnswer(state, action) {
        const newState = state.clone();
        const observation = newState.encounter.toggleMultiSelectAnswer(action.formElement.concept, action.answerUUID);
        const validationResult = action.formElement.validate(_.isNil(observation) ? null : observation.getValue());
        newState.handleValidationResult(validationResult);
        return newState;
    }

    static toggleSingleSelectAnswer(state, action) {
        const newState = state.clone();
        const observation = newState.encounter.toggleSingleSelectAnswer(action.concept, action.answerUUID);
        const validationResult = action.formElement.validate(_.isNil(observation) ? null : observation.getValue());
        newState.handleValidationResult(validationResult);
        return newState;
    }
}

export default ObservationsHolderActions;