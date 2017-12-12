import {ValidationResult} from "openchs-models";

class StubbedRuleEvaluationService {
    validateAgainstRule(entity) {
        return [ValidationResult.successful('whatever')];
    }

    getDecisions() {
        return [];
    }

    filterFormElements(entity, formElementGroup) {
        if (formElementGroup) return formElementGroup.formElements;
        return [];
    }
}

export default StubbedRuleEvaluationService;