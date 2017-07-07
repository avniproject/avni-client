import _ from "lodash";
import Concept from '../../models/Concept';
import Duration from "../../models/Duration";

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

    static toggleCodedAnswer(state, action) {
        const newState = state.clone();
        const observation = newState.observationsHolder.toggleCodedAnswer(action.formElement.concept, action.answerUUID, true);
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

    static onDurationChange(state, action, context) {
        const newState = state.clone();
        var dateValue;
        if (_.isNil(action.duration)) {
            dateValue = action.value;
        } else {
            const duration = new Duration(action.duration.durationValue, action.duration.durationUnit);
            dateValue = duration.dateInPastBasedOnToday();
            newState.formElementsUserState[action.formElement.uuid] = {durationUnit: action.duration.durationUnit};
        }
        newState.observationsHolder.addOrUpdatePrimitiveObs(action.formElement.concept, dateValue);

        const validationResult = action.formElement.validate(dateValue);
        newState.handleValidationResult(validationResult);
        return newState;
    }
}

export default ObservationsHolderActions;