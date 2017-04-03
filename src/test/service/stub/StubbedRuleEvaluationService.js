import ValidationResult from "../../../js/models/application/ValidationResult";

class StubbedRuleEvaluationService {
    validateAgainstRule(entity) {
        return [ValidationResult.successful('whatever')];
    }

    getDecision() {
        return [];
    }
}

export default StubbedRuleEvaluationService;