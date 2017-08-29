import _ from "lodash";

class ValidationResultsInspector {
    static numberOfErrors(validationResults) {
        return _.sumBy(validationResults, (validationResult) => validationResult.success ? 0 : 1);
    }
}

export default ValidationResultsInspector;