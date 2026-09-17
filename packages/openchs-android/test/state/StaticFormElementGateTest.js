import ProgramEncounterState from "../../src/state/ProgramEncounterState";
import EncounterActionState from "../../src/state/EncounterActionState";
import ChecklistItemState from "../../src/state/ChecklistItemState";
import ProgramEncounterCancelState from "../../src/action/program/ProgramEncounterCancelState";
import Wizard from "../../src/state/Wizard";
import {AbstractEncounter, ProgramEncounter, ValidationResult} from "avni-models";
import {assert} from "chai";

// The wizard starts at the first group with visible elements, so when a rule hides the first group
// the static fields (visit date, location, completion date) render on page 2, not page 1. Navigation
// must be blocked by their failures on that page, the same page the view renders them on.
const statesWithStaticFields = [
    {name: "ProgramEncounterState", State: ProgramEncounterState, key: AbstractEncounter.fieldKeys.ENCOUNTER_DATE_TIME},
    {name: "ProgramEncounterState (location)", State: ProgramEncounterState, key: ProgramEncounter.validationKeys.ENCOUNTER_LOCATION},
    {name: "EncounterActionState", State: EncounterActionState, key: AbstractEncounter.fieldKeys.ENCOUNTER_DATE_TIME},
    {name: "ChecklistItemState", State: ChecklistItemState, key: AbstractEncounter.fieldKeys.COMPLETION_DATE},
    {name: "ProgramEncounterCancelState", State: ProgramEncounterCancelState, key: ProgramEncounter.validationKeys.CANCEL_LOCATION},
];

function stateOn(State, wizard, failedKey) {
    const state = Object.create(State.prototype);
    state.wizard = wizard;
    state.formElementGroup = {formElementIds: [], name: "group"};
    state.validationResults = [ValidationResult.failure(failedKey, "emptyValidationMessage")];
    return state;
}

describe("Static field validations block navigation on the first form page", () => {
    statesWithStaticFields.forEach(({name, State, key}) => {
        describe(name, () => {
            it("blocks when the first group is hidden and the form starts on page 2", () => {
                const state = stateOn(State, new Wizard(3, 2, 2), key);
                assert.isTrue(state.anyFailedResultForCurrentFEG());
            });

            it("still blocks after going next and coming back to the first visible page", () => {
                const wizard = new Wizard(3, 2, 2);
                wizard.moveNext();
                wizard.movePrevious();
                const state = stateOn(State, wizard, key);
                assert.isTrue(state.anyFailedResultForCurrentFEG());
            });

            it("does not block on a later page when the first group is hidden", () => {
                const state = stateOn(State, new Wizard(3, 2, 3), key);
                assert.isFalse(state.anyFailedResultForCurrentFEG());
            });

            it("blocks on page 1 of an ordinary form and not on page 2", () => {
                const wizard = new Wizard(3, 1, 1);
                const state = stateOn(State, wizard, key);
                assert.isTrue(state.anyFailedResultForCurrentFEG());
                wizard.moveNext();
                assert.isFalse(state.anyFailedResultForCurrentFEG());
            });
        });
    });
});
