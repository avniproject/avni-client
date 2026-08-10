import {expect} from "chai";
import {ProgramEnrolmentDashboardActions as Actions} from "../../src/action/program/ProgramEnrolmentDashboardActions";

// Guards the programs-tab load-gate: the tab renders a loader until `loaded` is true, and interactions
// (which clone/spread state) must not drop it back to the loader.
describe("ProgramEnrolmentDashboardActions loaded flag", () => {
    it("starts not-loaded, so the tab shows the loader until ON_LOAD completes", () => {
        expect(Actions.getInitialState().loaded).to.equal(false);
    });

    it("preserves loaded across clone()", () => {
        const loaded = {...Actions.getInitialState(), loaded: true};
        expect(Actions.clone(loaded).loaded).to.equal(true);
    });

    it("preserves loaded across an enrolment-info toggle", () => {
        const loaded = {...Actions.getInitialState(), loaded: true};
        expect(Actions.onEnrolmentToggle(loaded).loaded).to.equal(true);
    });
});
