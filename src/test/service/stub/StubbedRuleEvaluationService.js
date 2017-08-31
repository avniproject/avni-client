import ValidationResult from "../../../js/models/application/ValidationResult";

class StubbedRuleEvaluationService {
    validateAgainstRule(entity) {
        return [ValidationResult.successful('whatever')];
    }

    getDecisions() {
        return [];
    }
}

export default StubbedRuleEvaluationService;