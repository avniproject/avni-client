import _ from "lodash";
import Concept from '../../models/Concept';

class ObservationsHolderActions {
    static onPrimitiveObsUpdateValue(state, action, context) {
        const newState = state.clone();
        if (action.formElement.concept.datatype === Concept.dataType.Numeric && !_.isEmpty(action.value) && _.isNaN(_.toNumber(action.value)))
            return newState;

        newState.observationsHolder.addOrUpdatePrimitiveObs(action.formElement.concept, action.value);
        return newState;
    }

    static onPrimitiveObsEndEditing(state, action, context) {
        const newState = state.clone();
        const validationResult = action.formElement.validate(action.value);
        newState.handleValidationResult(validationResult);
        return newState;
    }

    static toggleMultiSelectAnswer(state, action) {
        const newState = state.clone();
        const observation = newState.observationsHolder.toggleMultiSelectAnswer(action.formElement.concept, action.answerUUID);
        const validationResult = action.formElement.validate(_.isNil(observation) ? null : observation.getValueWrapper());
        newState.handleValidationResult(validationResult);
        return newState;
    }

    static toggleSingleSelectAnswer(state, action) {
        const newState = state.clone();
        const observation = newState.observationsHolder.toggleSingleSelectAnswer(action.formElement.concept, action.answerUUID);
        const validationResult = action.formElement.validate(_.isNil(observation) ? null : observation.getValueWrapper());
        newState.handleValidationResult(validationResult);
        return newState;
    }

    static onPrevious(state, action, context) {
        const newState = state.clone();
        newState.movePrevious();
        if (!(_.isNil(action) || _.isNil(action.cb)))
            action.cb(newState);
        return newState;
    }
}

export default ObservationsHolderActions;