import {FormElementStatus, ValidationResult} from 'openchs-models';

class StubbedRuleEvaluationService {
    validateAgainstRule(entity) {
        return [ValidationResult.successful('whatever')];
    }

    getDecisions() {
        return [];
    }

    getFormElementsStatuses(entity, entityType, formElementGroup) {
        if (formElementGroup) return formElementGroup.getFormElements().map((formElement) => new FormElementStatus(formElement.uuid, true, undefined));
        return [];
    }

    getValidationErrors(entity, entityName, formElementGroup) {
        return entity && entityName && formElementGroup ?
            this.getFormElementsStatuses(entity, entityName, formElementGroup).filter(e => !_.isEmpty(e.validationErrors)) :
            [];
    }

    getNextScheduledVisits() {
        return null;
    }

    updateWorkLists(workLists, context) {
        return workLists;
    }

    isEligibleForEncounter() {
        return true;
    }
}

export default StubbedRuleEvaluationService;
