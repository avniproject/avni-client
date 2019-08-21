import _ from "lodash";
import {Concept, Duration, FormElementGroup, ValidationResult} from 'openchs-models';
import RuleEvaluationService from "../../service/RuleEvaluationService";

class ObservationsHolderActions {
    static updateFormElements(formElementGroup, state, context) {
        const ruleService = context.get(RuleEvaluationService);
        let formElementStatuses = ruleService.getFormElementsStatuses(state.getEntity(), state.getEntityType(), formElementGroup);
        state.filteredFormElements = FormElementGroup._sortedFormElements(formElementGroup.filterElements(formElementStatuses));
        return formElementStatuses;
    }

    static getRuleValidationErrors(formElementStatuses) {
        return _.flatMap(formElementStatuses,
            status => new ValidationResult(_.isEmpty(status.validationErrors), status.uuid, _.head(status.validationErrors)));
    }

    static onPrimitiveObsUpdateValue(state, action, context) {
        const newState = state.clone();
        if (action.formElement.concept.datatype === Concept.dataType.Numeric && !_.isEmpty(action.value) && _.isNaN(_.toNumber(action.value)))
            return newState;

        newState.observationsHolder.addOrUpdatePrimitiveObs(action.formElement.concept, action.value);
        const formElementStatuses = ObservationsHolderActions._getFormElementStatuses(newState, context);
        const ruleValidationErrors = ObservationsHolderActions.getRuleValidationErrors(formElementStatuses);
        const hiddenFormElementStatus = _.filter(formElementStatuses, (form) => form.visibility === false);
        newState.observationsHolder.updatePrimitiveObs(newState.filteredFormElements, formElementStatuses);
        newState.removeHiddenFormValidationResults(hiddenFormElementStatus);
        newState.handleValidationResults(ruleValidationErrors, context);
        return newState;
    }

    static onPrimitiveObsEndEditing(state, action, context) {
        const newState = state.clone();
        const formElementStatuses = ObservationsHolderActions._getFormElementStatuses(newState, context);
        const ruleValidationErrors = ObservationsHolderActions.getRuleValidationErrors(formElementStatuses);
        const hiddenFormElementStatus = _.filter(formElementStatuses, (form) => form.visibility === false);
        const validationResult = action.formElement.validate(action.value);
        newState.handleValidationResults(_.union(validationResult, ruleValidationErrors), context);
        newState.removeHiddenFormValidationResults(hiddenFormElementStatus);
        return newState;
    }

    static toggleMultiSelectAnswer(state, action, context) {
        const newState = state.clone();
        const observation = newState.observationsHolder.toggleMultiSelectAnswer(action.formElement.concept, action.answerUUID);
        const formElementStatuses = ObservationsHolderActions._getFormElementStatuses(newState, context);
        const ruleValidationErrors = ObservationsHolderActions.getRuleValidationErrors(formElementStatuses);
        const hiddenFormElementStatus = _.filter(formElementStatuses, (form) => form.visibility === false);
        newState.observationsHolder.updatePrimitiveObs(newState.filteredFormElements, formElementStatuses);
        const validationResult = action.formElement.validate(_.isNil(observation) ? null : observation.getValueWrapper());
        newState.handleValidationResults(_.union(validationResult, ruleValidationErrors), context);
        newState.removeHiddenFormValidationResults(hiddenFormElementStatus);
        return newState;
    }

    static _getFormElementStatuses(newState, context) {
        const formElementStatuses = ObservationsHolderActions.updateFormElements(newState.formElementGroup, newState, context);
        const removedObs = newState.observationsHolder.removeNonApplicableObs(newState.formElementGroup.getFormElements(), newState.filteredFormElements);
        if (_.isEmpty(removedObs)) {
            return formElementStatuses;
        }
        return ObservationsHolderActions._getFormElementStatuses(newState, context);
    }

    static toggleSingleSelectAnswer(state, action, context) {
        const newState = state.clone();
        const observation = newState.observationsHolder.toggleSingleSelectAnswer(action.formElement.concept, action.answerUUID);
        const formElementStatuses = ObservationsHolderActions._getFormElementStatuses(newState, context);
        const ruleValidationErrors = ObservationsHolderActions.getRuleValidationErrors(formElementStatuses);
        const hiddenFormElementStatus = _.filter(formElementStatuses, (form) => form.visibility === false);
        const validationResult = action.formElement.validate(_.isNil(observation) ? null : observation.getValueWrapper());
        newState.observationsHolder.updatePrimitiveObs(newState.filteredFormElements, formElementStatuses);
        newState.handleValidationResults(_.union(validationResult, ruleValidationErrors), context);
        newState.removeHiddenFormValidationResults(hiddenFormElementStatus);
        return newState;
    }

    static onDateDurationChange(state, action, context) {
        const newState = state.clone();
        let dateValue;
        if (_.isNil(action.duration)) {
            dateValue = action.value;
        } else {
            const duration = new Duration(action.duration.durationValue, action.duration.durationUnit);
            dateValue = duration.dateInPastBasedOnToday(state.getEffectiveDataEntryDate());
            newState.formElementsUserState[action.formElement.uuid] = {durationUnit: action.duration.durationUnit};
        }
        newState.observationsHolder.addOrUpdatePrimitiveObs(action.formElement.concept, dateValue);
        const formElementStatuses = ObservationsHolderActions._getFormElementStatuses(newState, context);
        const ruleValidationErrors = ObservationsHolderActions.getRuleValidationErrors(formElementStatuses);
        const hiddenFormElementStatus = _.filter(formElementStatuses, (form) => form.visibility === false);
        newState.observationsHolder.updatePrimitiveObs(newState.filteredFormElements, formElementStatuses);
        const validationResult = action.formElement.validate(dateValue);
        newState.handleValidationResults(_.union(validationResult, ruleValidationErrors), context);
        newState.removeHiddenFormValidationResults(hiddenFormElementStatus);

        return newState;
    }

    static onDurationChange(state, action, context) {
        const newState = state.clone();
        const compositeDuration = action.compositeDuration;
        const observation = newState.observationsHolder.updateCompositeDurationValue(action.formElement.concept, compositeDuration);
        const formElementStatuses = ObservationsHolderActions._getFormElementStatuses(newState, context);
        const ruleValidationErrors = ObservationsHolderActions.getRuleValidationErrors(formElementStatuses);
        const hiddenFormElementStatus = _.filter(formElementStatuses, (form) => form.visibility === false);
        newState.observationsHolder.updatePrimitiveObs(newState.filteredFormElements, formElementStatuses);
        const validationResult = action.formElement.validate(_.isNil(observation) ? null : observation.getValueWrapper());
        newState.handleValidationResults(_.union(validationResult, ruleValidationErrors), context);
        newState.removeHiddenFormValidationResults(hiddenFormElementStatus);
        return newState;
    }
}

export default ObservationsHolderActions;
