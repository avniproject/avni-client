import {expect} from 'chai';
import ValidationResults from "../../js/models/application/ValidationResults";
import ValidationResult from "../../js/models/application/ValidationResult";

describe('ValidationResults', () => {

    it('holds a bunch of validation results', () => {
        expect(new ValidationResults().validationResults).to.be.empty;
        expect(new ValidationResults([ValidationResult.successful("a")]).validationResults).to.have.lengthOf(1);
    });

    it("lets you add new results on the fly", ()=> {
        let results = new ValidationResults([
            ValidationResult.successful("a"),
            ValidationResult.successful("b")
        ]);

        results.addOrReplace(ValidationResult.failure("b", 'replaces existing result'));
        expect(results.validationResults).to.have.lengthOf(2);

        results.addOrReplace(ValidationResult.failure("c", 'replaces existing result'));
        expect(results.validationResults).to.have.lengthOf(3);
    });

    it ("can get you the result for a particular key", () => {
        let oneResult = ValidationResult.successful("a");
        let results = new ValidationResults([oneResult, ValidationResult.successful("b")]);

        expect(results.resultFor(oneResult.formIdentifier)).to.equal(oneResult);
    });
});