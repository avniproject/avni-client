import _ from "lodash";
import {Concept, Duration, FormElementGroup, ValidationResult} from 'avni-models';
import RuleEvaluationService from "../../service/RuleEvaluationService";

class ObservationsHolderActions {
    static updateFormElements(formElementGroup, state, context) {
        const ruleService = context.get(RuleEvaluationService);
        let formElementStatuses = ruleService.getFormElementsStatuses(state.getEntity(), state.getEntityType(), formElementGroup);
        state.filteredFormElements = FormElementGroup._sortedFormElements(formElementGroup.filterElements(formElementStatuses));
        return formElementStatuses;
    }

    // We need to re-fetch the statuses to make sure any hidden form element due to empty values shows up this time.
    static hasQuestionGroupWithValueInElementStatus(formElementStatuses, allFormElements) {
        return _.some(formElementStatuses, ({uuid, value}) => {
            if (value) {
                return _.get(_.find(allFormElements, fe => fe.uuid === uuid), 'concept.datatype') === Concept.dataType.QuestionGroup
            }
        })
    }

    static getRuleValidationErrors(formElementStatuses) {
        return _.flatMap(formElementStatuses,
            status => new ValidationResult(_.isEmpty(status.validationErrors), status.uuid, _.head(status.validationErrors), null, status.questionGroupIndex));
    }

    static onPrimitiveObsUpdateValue(state, action, context) {
        const newState = state.clone();
        if (action.formElement.concept.datatype === Concept.dataType.Numeric && !_.isEmpty(action.value) && _.isNaN(_.toNumber(action.value)))
            return newState;
        const value = !_.isEmpty(action.value) && action.convertToNumber ? _.toNumber(action.value) : action.value;
        newState.observationsHolder.addOrUpdatePrimitiveObs(action.formElement.concept, value);
        const formElementStatuses = ObservationsHolderActions._getFormElementStatuses(newState, context);
        const ruleValidationErrors = ObservationsHolderActions.getRuleValidationErrors(formElementStatuses);
        const hiddenFormElementStatus = _.filter(formElementStatuses, (form) => form.visibility === false);
        newState.observationsHolder.updatePrimitiveCodedObs(newState.filteredFormElements, formElementStatuses);
        newState.removeHiddenFormValidationResults(hiddenFormElementStatus);
        let validationResult = action.formElement.validate(action.value);
        if (action.validationResult && validationResult.success) {
            validationResult = action.validationResult;
        }
        if (action.formElement.isUnique && !_.isNil(action.value) && validationResult.success) {
            validationResult = ObservationsHolderActions._validateForDuplicateObservation(newState, action.value, action.formElement, context);
        }
        newState.handleValidationResults(ObservationsHolderActions.addPreviousValidationErrors(ruleValidationErrors, validationResult, newState.validationResults), context);
        return newState;
    }

    static checkValidationResult(ruleValidationErrors, validationResult) {
        return _.map(ruleValidationErrors, error => {
            const {formIdentifier, questionGroupIndex, success} = validationResult;
            if ((error.formIdentifier === formIdentifier && (_.isNil(error.questionGroupIndex) || error.questionGroupIndex === questionGroupIndex) && !success)) {
                return validationResult
            }
            error.addQuestionGroupIndex(questionGroupIndex);
            return error;
        })
    }

    static addPreviousValidationErrors(ruleValidationErrors, validationResult, previousErrors) {
        const otherFEFailedStatuses = previousErrors.filter(({formIdentifier, success, questionGroupIndex}) => (validationResult.formIdentifier !== formIdentifier && !success && (_.isNil(questionGroupIndex) || questionGroupIndex !== validationResult.questionGroupIndex)));
        return [...ObservationsHolderActions.checkValidationResult(ruleValidationErrors, validationResult), ...otherFEFailedStatuses]
    }

    static onPrimitiveObsEndEditing(state, action, context) {
        const newState = state.clone();
        const formElementStatuses = ObservationsHolderActions._getFormElementStatuses(newState, context);
        const ruleValidationErrors = ObservationsHolderActions.getRuleValidationErrors(formElementStatuses);
        const hiddenFormElementStatus = _.filter(formElementStatuses, (form) => form.visibility === false);
        const validationResult = action.formElement.validate(action.value);
        newState.handleValidationResults(ObservationsHolderActions.addPreviousValidationErrors(ruleValidationErrors, validationResult, newState.validationResults), context);
        newState.removeHiddenFormValidationResults(hiddenFormElementStatus);
        return newState;
    }

    static toggleMultiSelectAnswer(state, action, context) {
        const newState = state.clone();
        const observation = newState.observationsHolder.toggleMultiSelectAnswer(action.formElement.concept, action.answerUUID);
        const formElementStatuses = ObservationsHolderActions._getFormElementStatuses(newState, context);
        const ruleValidationErrors = ObservationsHolderActions.getRuleValidationErrors(formElementStatuses);
        const hiddenFormElementStatus = _.filter(formElementStatuses, (form) => form.visibility === false);
        newState.observationsHolder.updatePrimitiveCodedObs(newState.filteredFormElements, formElementStatuses);
        const validationResult = action.formElement.validate(_.isNil(observation) ? null : observation.getValueWrapper());
        newState.handleValidationResults(ObservationsHolderActions.addPreviousValidationErrors(ruleValidationErrors, validationResult, newState.validationResults), context);
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
        newState.observationsHolder.updatePrimitiveCodedObs(newState.filteredFormElements, formElementStatuses);
        newState.handleValidationResults(ObservationsHolderActions.addPreviousValidationErrors(ruleValidationErrors, validationResult, newState.validationResults), context);
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
        newState.observationsHolder.updatePrimitiveCodedObs(newState.filteredFormElements, formElementStatuses);
        const validationResult = action.formElement.validate(dateValue);
        newState.handleValidationResults(ObservationsHolderActions.addPreviousValidationErrors(ruleValidationErrors, validationResult, newState.validationResults), context);
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
        newState.observationsHolder.updatePrimitiveCodedObs(newState.filteredFormElements, formElementStatuses);
        const validationResult = action.formElement.validate(_.isNil(observation) ? null : observation.getValueWrapper());
        newState.handleValidationResults(ObservationsHolderActions.addPreviousValidationErrors(ruleValidationErrors, validationResult, newState.validationResults), context);
        newState.removeHiddenFormValidationResults(hiddenFormElementStatus);
        return newState;
    }

    static onPhoneNumberChange(state, action, context) {
        const newState = state.clone();
        const observation = newState.observationsHolder.updatePhoneNumberValue(action.formElement.concept, action.value);
        const formElementStatuses = ObservationsHolderActions._getFormElementStatuses(newState, context);
        const ruleValidationErrors = ObservationsHolderActions.getRuleValidationErrors(formElementStatuses);
        const hiddenFormElementStatus = _.filter(formElementStatuses, (form) => form.visibility === false);
        newState.observationsHolder.updatePrimitiveCodedObs(newState.filteredFormElements, formElementStatuses);
        const value = _.isNil(observation) ? null : observation.getValueWrapper().getValue();
        let validationResult = action.formElement.validate(value);
        if (action.formElement.isUnique && !_.isNil(value) && validationResult.success) {
            validationResult = ObservationsHolderActions._validateForDuplicateObservation(newState, value, action.formElement, context);
        }
        newState.handleValidationResults(ObservationsHolderActions.addPreviousValidationErrors(ruleValidationErrors, validationResult, newState.validationResults), context);
        newState.removeHiddenFormValidationResults(hiddenFormElementStatus);
        return newState;
    }

    static onGroupQuestionChange(state, action, context) {
        const newState = state.clone();
        if (action.formElement.concept.datatype === Concept.dataType.Numeric && !_.isEmpty(action.value) && _.isNaN(_.toNumber(action.value)))
            return newState;
        const value = !_.isEmpty(action.value) && action.convertToNumber ? _.toNumber(action.value) : action.value;
        newState.observationsHolder.updateGroupQuestion(action.parentFormElement, action.formElement, value);
        return ObservationsHolderActions.handleFormElementStatuses(newState, context, action);
    }

    static onRepeatableGroupQuestionChange(state, action, context) {
        const newState = state.clone();
        if (action.formElement.concept.datatype === Concept.dataType.Numeric && !_.isEmpty(action.value) && _.isNaN(_.toNumber(action.value)))
            return newState;
        const value = !_.isEmpty(action.value) && action.convertToNumber ? _.toNumber(action.value) : action.value || action.answerUUID;
        newState.observationsHolder.updateRepeatableGroupQuestion(action.questionGroupIndex, action.parentFormElement, action.formElement, value, action.action);
        return ObservationsHolderActions.handleFormElementStatuses(newState, context, action);
    }

    static handleFormElementStatuses(newState, context, action) {
        let formElementStatuses = ObservationsHolderActions._getFormElementStatuses(newState, context);
        if (ObservationsHolderActions.hasQuestionGroupWithValueInElementStatus(formElementStatuses, action.formElement.formElementGroup.getFormElements())) {
            formElementStatuses = ObservationsHolderActions._getFormElementStatuses(newState, context);
        }
        const ruleValidationErrors = ObservationsHolderActions.getRuleValidationErrors(formElementStatuses);
        const hiddenFormElementStatus = _.filter(formElementStatuses, (form) => form.visibility === false);
        newState.observationsHolder.updatePrimitiveCodedObs(newState.filteredFormElements, formElementStatuses);
        newState.removeHiddenFormValidationResults(hiddenFormElementStatus);
        let validationResult = action.formElement.validate(action.value);
        validationResult.addQuestionGroupIndex(action.questionGroupIndex);
        if (action.validationResult && validationResult.success) {
            validationResult = action.validationResult;
        }
        if (action.formElement.isUnique && !_.isNil(action.value) && validationResult.success) {
            validationResult = ObservationsHolderActions._validateForDuplicateObservation(newState, action.value, action.formElement, context);
        }
        newState.handleValidationResults(ObservationsHolderActions.addPreviousValidationErrors(ruleValidationErrors, validationResult, newState.validationResults), context);
        return newState;
    }

    static _validateForDuplicateObservation(state, value, formElement, context) {
        const currentEntity = state.getEntity();
        const observationFilter = ObservationsHolderActions._getObservationFilterQueryByConceptType(formElement.concept, value);
        const allEntitiesOfSameType = state.getEntityResultSetByType(context);
        const entitiesWithDuplicateObservations = allEntitiesOfSameType.filtered('uuid <> $0', currentEntity.uuid).filtered(observationFilter);
        const subjectTypeName = _.get(currentEntity, 'individual.subjectType.name');
        return _.isEmpty(entitiesWithDuplicateObservations) ? new ValidationResult(true, formElement.uuid, null) : new ValidationResult(false, formElement.uuid, 'duplicateValue', {subjectTypeName});
    }

    static _getObservationFilterQueryByConceptType(concept, value) {
        switch (concept.datatype) {
            case Concept.dataType.PhoneNumber :
                return `SUBQUERY(observations, $observation, $observation.concept.uuid = "${concept.uuid}" and $observation.valueJSON contains '"phoneNumber":"${value}"' ).@count > 0`;
            case Concept.dataType.Text :
                return `SUBQUERY(observations, $observation, $observation.concept.uuid = "${concept.uuid}" and $observation.valueJSON contains '"value":"${value}"' ).@count > 0`;
            case Concept.dataType.Numeric :
                return `SUBQUERY(observations, $observation, $observation.concept.uuid = "${concept.uuid}" and ($observation.valueJSON contains '"value":${value}' OR $observation.valueJSON contains '"value":"${value}"') ).@count > 0`;
            default :
                return `uuid = null`;
        }
    }
}

export default ObservationsHolderActions;
