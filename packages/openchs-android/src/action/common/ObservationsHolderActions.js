import _ from "lodash";
import {Concept, Duration} from 'openchs-models';
import RuleEvaluationService from "../../service/RuleEvaluationService";
import General from "../../utility/General";

class ObservationsHolderActions {
    static updatedFormElements(entity, formElementGroup, state, context) {
        const ruleService = context.get(RuleEvaluationService);
        let formElementStatuses = ruleService.filterFormElements(entity, formElementGroup);
        state.filteredFormElements = formElementGroup.filterElements(formElementStatuses);
    }

    static onPrimitiveObsUpdateValue(state, action, context) {
        const newState = state.clone();
        if (action.formElement.concept.datatype === Concept.dataType.Numeric && !_.isEmpty(action.value) && _.isNaN(_.toNumber(action.value)))
            return newState;

        newState.observationsHolder.addOrUpdatePrimitiveObs(action.formElement.concept, action.value);
        ObservationsHolderActions.updatedFormElements(newState.getEntity(), newState.formElementGroup, newState, context);
        return newState;
    }

    static onPrimitiveObsEndEditing(state, action, context) {
        const newState = state.clone();
        const validationResult = action.formElement.validate(action.value);
        newState.handleValidationResult(validationResult);
        ObservationsHolderActions.updatedFormElements(newState.getEntity(), newState.formElementGroup, newState, context);
        return newState;
    }

    static toggleMultiSelectAnswer(state, action, context) {
        const newState = state.clone();
        const observation = newState.observationsHolder.toggleMultiSelectAnswer(action.formElement.concept, action.answerUUID);
        const validationResult = action.formElement.validate(_.isNil(observation) ? null : observation.getValueWrapper());
        newState.handleValidationResult(validationResult);
        ObservationsHolderActions.updatedFormElements(newState.getEntity(), newState.formElementGroup, newState, context);
        return newState;
    }

    static toggleSingleSelectAnswer(state, action, context) {
        const newState = state.clone();
        const observation = newState.observationsHolder.toggleSingleSelectAnswer(action.formElement.concept, action.answerUUID);
        const validationResult = action.formElement.validate(_.isNil(observation) ? null : observation.getValueWrapper());
        newState.handleValidationResult(validationResult);
        ObservationsHolderActions.updatedFormElements(newState.getEntity(), newState.formElementGroup, newState, context);
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
        ObservationsHolderActions.updatedFormElements(newState.getEntity(), newState.formElementGroup, newState, context);
        return newState;
    }
}

export default ObservationsHolderActions;