import ValidationResult from "../../../js/models/application/ValidationResult";

class StubbedRuleEvaluationService {
    validateEncounter() {
        return ValidationResult.successful('whatever');
    }

    getEncounterDecision() {
        return [];
    }
}

export default StubbedRuleEvaluationService;