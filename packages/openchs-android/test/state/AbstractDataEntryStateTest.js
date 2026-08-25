import AbstractDataEntryState from "../../src/state/AbstractDataEntryState";
import {ValidationResult} from "avni-models";
import {assert} from "chai";

const ENCOUNTER_DATE_TIME = "ENCOUNTER_DATE_TIME";

// Entity validate() emits success+failure for the same key when the date is present but invalid
// (e.g. in the future). The Next-merge must keep the failure, or navigation proceeds past a
// rendered error (#2056).
class StubDataEntryState extends AbstractDataEntryState {
    constructor(entityValidationResults) {
        const formElementGroup = {
            formElementIds: [],
            validate: () => [],
        };
        super([], formElementGroup, {currentPage: 1, formStartsAt: 1}, true, [], null, null, true);
        this.entityValidationResults = entityValidationResults;
    }

    validateEntity() {
        return this.entityValidationResults;
    }

    get observationsHolder() {
        return {};
    }

    get staticFormElementIds() {
        return [ENCOUNTER_DATE_TIME];
    }
}

const contextStub = {
    get: () => ({getSettings: () => ({devSkipValidation: false})}),
};

describe("AbstractDataEntryState validation merge", () => {
    it("keeps the failure when validateEntity emits success and failure for the same key", () => {
        const state = new StubDataEntryState([
            ValidationResult.successful(ENCOUNTER_DATE_TIME),
            ValidationResult.failure(ENCOUNTER_DATE_TIME, "encounterDateInFuture"),
        ]);

        state._handleNextInternal1(contextStub);

        const stored = ValidationResult.findByFormIdentifier(state.validationResults, ENCOUNTER_DATE_TIME);
        assert.isDefined(stored, "the failed result must survive the merge");
        assert.isFalse(stored.success);
        assert.equal(stored.messageKey, "encounterDateInFuture");
        assert.isTrue(state.anyFailedResultForCurrentFEG(), "navigation must be blocked");
    });

    it("still blocks for a lone failure (empty date)", () => {
        const state = new StubDataEntryState([
            ValidationResult.failure(ENCOUNTER_DATE_TIME, "emptyValidationMessage"),
        ]);

        state._handleNextInternal1(contextStub);

        assert.isTrue(state.anyFailedResultForCurrentFEG());
    });

    it("clears a previously stored failure once the entity validates clean", () => {
        const state = new StubDataEntryState([
            ValidationResult.successful(ENCOUNTER_DATE_TIME),
        ]);
        state.validationResults = [ValidationResult.failure(ENCOUNTER_DATE_TIME, "encounterDateInFuture")];

        state._handleNextInternal1(contextStub);

        assert.isFalse(state.anyFailedResultForCurrentFEG(), "a corrected date must unblock navigation");
    });
});
