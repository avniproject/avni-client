import {ValidationResult} from "openchs-models";

class StubbedRuleEvaluationService {
    validateAgainstRule(entity) {
        return [ValidationResult.successful('whatever')];
    }

    getDecisions() {
        return [];
    }
}

export default StubbedRuleEvaluationService;