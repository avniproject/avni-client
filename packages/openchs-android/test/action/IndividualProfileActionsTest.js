import {expect} from "chai";
import {IndividualProfileActions as IPA} from "../../src/action/individual/IndividualProfileActions";
import TestContext from "./views/testframework/TestContext";
import {Individual} from 'avni-models';
import EntityFactory from "../EntityFactory";

describe('IndividualProfileActionsTest', () => {
    xit('programEnrolmentFlow', () => {
        var state = IPA.getInitialState();
        const tbProgram = EntityFactory.createSafeProgram('TB');
        const individual = Individual.createEmptyInstance();
        const serviceData = {eligiblePrograms: [tbProgram, EntityFactory.createSafeProgram('Mother')]};
        serviceData[individual.uuid] = individual;

        state = IPA.individualSelected(state, {individual: individual}, new TestContext(serviceData));
        state = IPA.launchChooseProgram(state);
        state = IPA.selectedProgram(state, {value: tbProgram});
        state = IPA.programSelectionConfirmed(state, {cb: () => {}});
        expect(state.entity.program.name).is.equal(tbProgram.name);
    });
});
describe('IndividualProfileActions.displayedIndividual', () => {
    const subject = (uuid, subjectLocation = null) => ({uuid, subjectLocation});

    it('ignores a saved subject left in state by a different profile', () => {
        const saved = subject('a', {latitude: 1, longitude: 2});
        const shown = subject('b');
        expect(IPA.displayedIndividual({individual: saved}, shown)).to.equal(shown);
    });

    it('prefers the re-read subject in state for the same profile', () => {
        const saved = subject('a', {latitude: 1, longitude: 2});
        expect(IPA.displayedIndividual({individual: saved}, subject('a'))).to.equal(saved);
    });

    it('falls back to the prop when state has no subject', () => {
        const shown = subject('a');
        expect(IPA.displayedIndividual({individual: null}, shown)).to.equal(shown);
        expect(IPA.displayedIndividual(null, shown)).to.equal(shown);
    });
});
