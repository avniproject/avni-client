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

    getNextScheduledVisits() {
        return null;
    }
}

export default StubbedRuleEvaluationService;