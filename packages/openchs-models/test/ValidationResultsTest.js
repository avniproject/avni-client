import {assert} from 'chai';
import ValidationResults from "../src/application/ValidationResults";
import ValidationResult from "../src/application/ValidationResult";

describe('ValidationResults', () => {

    it('holds a bunch of validation results', () => {
        assert.isEmpty(new ValidationResults().validationResults);
        assert.lengthOf(new ValidationResults([ValidationResult.successful("a")]).validationResults, 1);
    });

    it("lets you add new results on the fly", ()=> {
        let results = new ValidationResults([
            ValidationResult.successful("a"),
            ValidationResult.successful("b")
        ]);

        results.addOrReplace(ValidationResult.failure("b", 'replaces existing result'));
        assert.lengthOf(results.validationResults, 2);

        results.addOrReplace(ValidationResult.failure("c", 'replaces existing result'));
        assert.lengthOf(results.validationResults, 3);
    });

    it ("can get you the result for a particular key", () => {
        let oneResult = ValidationResult.successful("a");
        let results = new ValidationResults([oneResult, ValidationResult.successful("b")]);

        assert.equal(results.resultFor(oneResult.formIdentifier), oneResult);
    });
});