import {expect} from "chai";
import {ProgramEnrolmentDashboardActions as Actions} from "../../src/action/program/ProgramEnrolmentDashboardActions";
import SettingsService from "../../src/service/SettingsService";

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

    it("clears loaded and the previous subject's data on landing", () => {
        const previousSubject = {
            ...Actions.getInitialState(),
            loaded: true,
            completedEncounters: [{}, {}],
            draftUnScheduledProgramEncounters: [{}],
            enrolmentSummary: [{}],
            dashboardButtons: [{}],
            showCount: 25
        };
        const getEnrolment = Actions._getEnrolment;
        Actions._getEnrolment = (state) => state.enrolment;
        try {
            const landed = Actions.onLanding(previousSubject, {}, {});
            expect(landed.loaded).to.equal(false);
            expect(landed.completedEncounters).to.deep.equal([]);
            expect(landed.draftUnScheduledProgramEncounters).to.deep.equal([]);
            expect(landed.enrolmentSummary).to.deep.equal([]);
            expect(landed.dashboardButtons).to.deep.equal([]);
            expect(landed.showCount).to.equal(SettingsService.IncrementalEncounterDisplayCount);
        } finally {
            Actions._getEnrolment = getEnrolment;
        }
    });
});
