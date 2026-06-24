import _ from "lodash";
import {Concept, Duration, FormElementGroup, Observation, RepeatableQuestionGroup, ValidationResult} from 'openchs-models';
import RuleEvaluationService from "../../service/RuleEvaluationService";
import General from "../../utility/General";

class ObservationsHolderActions {
    static updateFormElements(formElementGroup, state, context) {
        const ruleService = context.get(RuleEvaluationService);
        const formElementStatuses = ruleService.getFormElementsStatuses(state.getEntity(), state.getEntityType(), formElementGroup, state.getEntityContext());
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
            status => new ValidationResult(_.isEmpty(status.validationErrors), status.uuid,
                _.head(status.validationErrors), null, status.questionGroupIndex,
                ValidationResult.ValidationTypes.Rule));
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
        newState.observationsHolder.updatePrimitiveCodedObs(_.filter(newState.filteredFormElements, (fe) => {
            const observation = newState.observationsHolder.findObservation(fe.concept);
            return _.isNil(observation) || observation.valueJSON.answerSource !== Observation.AnswerSource.Manual;
        }), formElementStatuses);
        newState.removeHiddenFormValidationResults(hiddenFormElementStatus);
        let validationResult = action.formElement.validate(value);
        if (action.validationResult && validationResult.success) {
            validationResult = action.validationResult;
        }
        if (action.formElement.isUnique && !_.isNil(action.value) && validationResult.success) {
            validationResult = ObservationsHolderActions._ensureValueIsUniqueInTheDatabase(newState, action.value, action.formElement, context);
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
            if (error.formIdentifier === formIdentifier && _.isNil(error.questionGroupIndex))
                error.addQuestionGroupIndex(questionGroupIndex);
            return error;
        })
    }

    static addPreviousValidationErrors(ruleValidationErrors, validationResult, previousErrors) {
        const validationResultsThatNeedToBePreserved = previousErrors.filter(({validationType}) => (validationType !== ValidationResult.ValidationTypes.Rule));
        const validationResultsThatNeedToBePreservedExcludingCurrentValidationResult = validationResultsThatNeedToBePreserved.filter(({
                                                                                                                                          formIdentifier,
                                                                                                                                          success,
                                                                                                                                          questionGroupIndex
                                                                                                                                      }) => (validationResult.formIdentifier !== formIdentifier && !success && (_.isNil(questionGroupIndex) || questionGroupIndex !== validationResult.questionGroupIndex)))
        return [...ObservationsHolderActions.checkValidationResult(ruleValidationErrors, validationResult), ...validationResultsThatNeedToBePreservedExcludingCurrentValidationResult]
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
        const answerUUIDs = action.answerUUIDs || [action.answerUUID];
        let observation;
        for (const uuid of answerUUIDs) {
            observation = newState.observationsHolder.toggleMultiSelectAnswer(action.formElement.concept, uuid);
        }
        const formElementStatuses = ObservationsHolderActions._getFormElementStatuses(newState, context);
        const ruleValidationErrors = ObservationsHolderActions.getRuleValidationErrors(formElementStatuses);
        const hiddenFormElementStatus = _.filter(formElementStatuses, (form) => form.visibility === false);
        newState.observationsHolder.updatePrimitiveCodedObs(_.filter(newState.filteredFormElements, (fe) => {
            const observation = newState.observationsHolder.findObservation(fe.concept);
            return _.isNil(observation) || observation.valueJSON.answerSource !== Observation.AnswerSource.Manual;
        }), formElementStatuses);
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

    /**
     * Handler for EDGE_MODEL.INFERENCE_RESULT_AVAILABLE, dispatched by EdgeModelService
     * when a backgrounded inference resolves. Writes the result as an observation on the
     * target concept and re-runs form-element rules so the dependent element re-renders.
     *
     * Routes by concept datatype:
     *   • Coded concept: value is the answer's concept NAME (e.g. "Suspicious"); the
     *     model layer resolves it to the answer UUID. See
     *     ObservationsHolder.addOrUpdateCodedObs → Concept.getAnswerWithConceptName.
     *   • Primitive (text/numeric/date): value is stored verbatim.
     *
     * When the action carries a questionGroupConceptName, the result is written into row
     * `questionGroupIndex` of that Repeatable Question Group instead of at top level.
     *
     * Safe to dispatch even when this form isn't open: combineReducers fans the action
     * out to every form's reducer slice, but if the slice isn't currently editing a
     * form (no formElementGroup, no matching concept on the page) we bail and return
     * the state unchanged.
     */
    static onInferenceResultAvailable(state, action, context) {
        if (!state || !state.formElementGroup || !state.observationsHolder) return state;
        const newState = state.clone();
        if (!ObservationsHolderActions._applyInferenceWrite(newState, action)) return state;
        ObservationsHolderActions._getFormElementStatuses(newState, context);
        return newState;
    }

    /**
     * Handler for a coalesced burst of observation writes — EDGE_MODEL.INFERENCE_RESULTS_BATCH
     * (verdicts from EdgeModelService) and RULE_SERVICE.OBSERVATION_WRITE_BATCH (direct group
     * copies from RuleService) both route here. Applies every write first, then re-runs the
     * form-element rules ONCE, instead of once per result. The writes are independent (each targets
     * its own concept / RQG row) so the single trailing re-eval sees them all. Results whose target
     * isn't on the current page are skipped, exactly as the per-result handler does.
     */
    static onObservationWriteBatch(state, action, context) {
        if (!state || !state.formElementGroup || !state.observationsHolder) return state;
        if (_.isEmpty(action.results)) return state;
        const newState = state.clone();
        let appliedAny = false;
        for (const result of action.results) {
            if (ObservationsHolderActions._applyInferenceWrite(newState, result)) appliedAny = true;
        }
        if (!appliedAny) return state;
        ObservationsHolderActions._getFormElementStatuses(newState, context);
        return newState;
    }

    /**
     * Writes a single inference result into `newState.observationsHolder` WITHOUT re-running
     * the form-element rules — the caller does that once (so a batch re-evals once, not N
     * times). Returns true if a write was applied, false if the result's target concept/row
     * isn't on the current page (so the caller can leave the state untouched). Routing mirrors
     * onInferenceResultAvailable:
     *   • Coded concept: value is the answer NAME, resolved to the answer UUID.
     *   • Primitive (text/numeric/date): value stored verbatim.
     *   • questionGroupConceptName present: written into row `questionGroupIndex` of that RQG.
     */
    static _applyInferenceWrite(newState, result) {
        if (result.questionGroupConceptName != null) {
            return ObservationsHolderActions._applyInferenceWriteIntoGroup(newState, result);
        }
        const formElement = _.find(
            newState.formElementGroup.getFormElements(),
            fe => fe && fe.concept && fe.concept.name === result.conceptName
        );
        if (!formElement) return false;
        if (formElement.concept.isCodedConcept()) {
            newState.observationsHolder.addOrUpdateCodedObs(
                formElement.concept, result.value, formElement.isSingleSelect()
            );
        } else {
            newState.observationsHolder.addOrUpdatePrimitiveObs(formElement.concept, result.value);
        }
        return true;
    }

    static _applyInferenceWriteIntoGroup(newState, result) {
        const childFormElement = _.find(
            newState.formElementGroup.getFormElements(),
            fe => fe && fe.concept && fe.concept.name === result.conceptName && fe.isQuestionGroup()
                && _.get(fe.getParentFormElement(), 'concept.name') === result.questionGroupConceptName
        );
        if (!childFormElement) return false;
        const parentFormElement = childFormElement.getParentFormElement();
        if (!parentFormElement || !parentFormElement.isRepeatableQuestionGroup()) return false;

        const parentObs = newState.observationsHolder.getObservation(parentFormElement.concept);
        const rqg = parentObs && parentObs.getValueWrapper();
        if (!rqg || rqg.size() <= result.questionGroupIndex) {
            General.logDebug('ObservationsHolderActions',
                `onInferenceResult SKIP: RQG '${result.questionGroupConceptName}' has no row ${result.questionGroupIndex}`);
            return false;
        }

        const childConcept = childFormElement.concept;
        let value = result.value;
        if (childConcept.isCodedConcept()) {
            // updateChildObservations expects the answer concept UUID for coded; resolve the
            // (already label-mapped) answer name the same way addOrUpdateCodedObs does.
            const answer = childConcept.getAnswerWithConceptName(result.value);
            value = answer && answer.concept ? answer.concept.uuid : null;
            if (value == null) {
                General.logError('ObservationsHolderActions',
                    `onWrite SKIP: no coded answer '${result.value}' on concept '${childConcept.name}'`);
                return false;
            }
        } else if (childConcept.isMediaConcept() && value == null) {
            return false;
        }
        // Coded answers and media URIs are both stored single-select, so updateRepeatableGroupQuestion
        // TOGGLES — re-writing the same answer/URI (e.g. a retake re-confirming a verdict, or a rule
        // re-emitting an image) would clear it. Drop any existing child obs first so the value is
        // always set fresh (parity with addOrUpdateCodedObs).
        if (childConcept.isCodedConcept() || childConcept.isMediaConcept()) {
            rqg.getGroupObservationAtIndex(result.questionGroupIndex).removeExistingObs(childConcept);
        }
        newState.observationsHolder.updateRepeatableGroupQuestion(
            result.questionGroupIndex, parentFormElement, childFormElement, value
        );
        return true;
    }

    static toggleSingleSelectAnswer(state, action, context) {
        const newState = state.clone();
        const observation = newState.observationsHolder.toggleSingleSelectAnswer(action.formElement.concept, action.answerUUID);
        const formElementStatuses = ObservationsHolderActions._getFormElementStatuses(newState, context);
        const ruleValidationErrors = ObservationsHolderActions.getRuleValidationErrors(formElementStatuses);
        const hiddenFormElementStatus = _.filter(formElementStatuses, (form) => form.visibility === false);
        const validationResult = action.formElement.validate(_.isNil(observation) ? null : observation.getValueWrapper());
        newState.observationsHolder.updatePrimitiveCodedObs(_.filter(newState.filteredFormElements, (fe) => {
            const observation = newState.observationsHolder.findObservation(fe.concept);
            return _.isNil(observation) || observation.valueJSON.answerSource !== Observation.AnswerSource.Manual;
        }), formElementStatuses);
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
        newState.observationsHolder.updatePrimitiveCodedObs(_.filter(newState.filteredFormElements, (fe) => {
            const observation = newState.observationsHolder.findObservation(fe.concept);
            return _.isNil(observation) || observation.valueJSON.answerSource !== Observation.AnswerSource.Manual;
        }), formElementStatuses);
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
        newState.observationsHolder.updatePrimitiveCodedObs(_.filter(newState.filteredFormElements, (fe) => {
            const observation = newState.observationsHolder.findObservation(fe.concept);
            return _.isNil(observation) || observation.valueJSON.answerSource !== Observation.AnswerSource.Manual;
        }), formElementStatuses);
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
        newState.observationsHolder.updatePrimitiveCodedObs(_.filter(newState.filteredFormElements, (fe) => {
            const observation = newState.observationsHolder.findObservation(fe.concept);
            return _.isNil(observation) || observation.valueJSON.answerSource !== Observation.AnswerSource.Manual;
        }), formElementStatuses);
        const value = _.isNil(observation) ? null : observation.getValueWrapper().getValue();
        let validationResult = action.formElement.validate(value);
        if (action.formElement.isUnique && !_.isNil(value) && validationResult.success) {
            validationResult = ObservationsHolderActions._ensureValueIsUniqueInTheDatabase(newState, value, action.formElement, context);
        }
        newState.handleValidationResults(ObservationsHolderActions.addPreviousValidationErrors(ruleValidationErrors, validationResult, newState.validationResults), context);
        newState.removeHiddenFormValidationResults(hiddenFormElementStatus);
        return newState;
    }

    static onGroupQuestionChange(state, action, context) {
        const newState = state.clone();
        const dataType = action.formElement.concept.datatype;
        if (dataType === Concept.dataType.Numeric && !_.isEmpty(action.value) && _.isNaN(_.toNumber(action.value)))
            return newState;
        let value = !_.isEmpty(action.value) && action.convertToNumber ? _.toNumber(action.value) : action.value || action.answerUUID;
        if (dataType === Concept.dataType.Duration) {
            value = action.compositeDuration;
        }
        if (dataType === Concept.dataType.Date && !_.isNil(action.formElement.durationOptions)) {
            if (_.isNil(action.duration)) {
                value = action.value;
            } else {
                const duration = new Duration(action.duration.durationValue, action.duration.durationUnit);
                value = duration.dateInPastBasedOnToday(state.getEffectiveDataEntryDate());
                newState.formElementsUserState[`${action.formElement.uuid}-0`] = {durationUnit: action.duration.durationUnit};
            }
        }
        newState.observationsHolder.updateGroupQuestion(action.parentFormElement, action.formElement, value);
        return ObservationsHolderActions.handleFormElementStatuses(newState, context, action, value);
    }

    static onRepeatableGroupQuestionChange(state, action, context) {
        const newState = state.clone();
        const dataType = action.formElement.concept.datatype;
        if (dataType === Concept.dataType.Numeric && !_.isEmpty(action.value) && _.isNaN(_.toNumber(action.value)))
            return newState;

        const isStructuralAction = action.action === RepeatableQuestionGroup.actions.add
            || action.action === RepeatableQuestionGroup.actions.remove;
        const answerUUIDs = _.isArray(action.answerUUIDs) ? action.answerUUIDs : null;

        let value;
        if (answerUUIDs) {
            // Select/Unselect-all inside an RQG row: toggle each uuid against the row's child observation.
            answerUUIDs.forEach((uuid) => {
                newState.observationsHolder.updateRepeatableGroupQuestion(
                    action.questionGroupIndex, action.parentFormElement, action.formElement, uuid
                );
            });
            const postToggleObs = newState.observationsHolder.findQuestionGroupObservation(
                action.formElement.concept, action.parentFormElement, action.questionGroupIndex
            );
            value = postToggleObs ? postToggleObs.getValueWrapper() : null;
        } else {
            value = !_.isEmpty(action.value) && action.convertToNumber ? _.toNumber(action.value) : action.value || action.answerUUID;
            if (dataType === Concept.dataType.Duration) {
                value = action.compositeDuration;
            }
            if (dataType === Concept.dataType.Date && !_.isNil(action.formElement.durationOptions)) {
                if (_.isNil(action.duration)) {
                    value = action.value;
                } else {
                    const duration = new Duration(action.duration.durationValue, action.duration.durationUnit);
                    value = duration.dateInPastBasedOnToday(state.getEffectiveDataEntryDate());
                    newState.formElementsUserState[`${action.formElement.uuid}-${action.questionGroupIndex}`] = {durationUnit: action.duration.durationUnit};
                }
            }
            newState.observationsHolder.updateRepeatableGroupQuestion(action.questionGroupIndex, action.parentFormElement, action.formElement, value, action.action);
        }
        return ObservationsHolderActions.handleFormElementStatuses(newState, context, action, value, isStructuralAction);
    }

    static handleFormElementStatuses(newState, context, action, value, skipElementValidation = false) {
        let formElementStatuses = ObservationsHolderActions._getFormElementStatuses(newState, context);
        if (ObservationsHolderActions.hasQuestionGroupWithValueInElementStatus(formElementStatuses, action.formElement.formElementGroup.getFormElements())) {
            formElementStatuses = ObservationsHolderActions._getFormElementStatuses(newState, context);
        }
        const ruleValidationErrors = ObservationsHolderActions.getRuleValidationErrors(formElementStatuses);
        const hiddenFormElementStatus = _.filter(formElementStatuses, (form) => form.visibility === false);
        newState.observationsHolder.updatePrimitiveCodedObs(newState.filteredFormElements, formElementStatuses);
        newState.removeHiddenFormValidationResults(hiddenFormElementStatus);
        let validationResult;
        if (skipElementValidation) {
            // add/remove a question-group row carries no value to validate against the parent RQG.
            // Emit a success so any prior "empty" error on the parent is cleared instead of preserved.
            validationResult = ValidationResult.successful(action.formElement.uuid);
        } else {
            validationResult = action.formElement.validate(value);
        }
        validationResult.addQuestionGroupIndex(action.questionGroupIndex);
        if (!skipElementValidation && action.validationResult && validationResult.success) {
            validationResult = action.validationResult;
        }
        if (!skipElementValidation && action.formElement.isUnique && !_.isNil(value) && validationResult.success) {
            validationResult = ObservationsHolderActions._ensureValueIsUniqueInTheDatabase(newState, value, action.formElement, context);
        }
        newState.handleValidationResults(ObservationsHolderActions.addPreviousValidationErrors(ruleValidationErrors, validationResult, newState.validationResults), context);
        return newState;
    }

    static _ensureValueIsUniqueInTheDatabase(state, value, formElement, context) {
        const currentEntity = state.getEntity();
        const observationFilter = ObservationsHolderActions._getObservationFilterQueryByConceptType(formElement.concept, value);
        const allEntitiesOfSameType = state.getEntityResultSetByType(context);
        const entitiesWithDuplicateObservations = allEntitiesOfSameType.filtered('uuid <> $0', currentEntity.uuid).filtered(observationFilter);
        const subjectTypeName = _.get(currentEntity, 'individual.subjectType.name');
        return entitiesWithDuplicateObservations.length === 0 ?
            new ValidationResult(true, formElement.uuid, null, null, null, ValidationResult.ValidationTypes.Database) :
            new ValidationResult(false, formElement.uuid, 'duplicateValue', {subjectTypeName}, null, ValidationResult.ValidationTypes.Database);
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
