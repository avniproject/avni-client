import {expect} from "chai";
import {Concept} from "avni-models";
import EntityFactory from "../EntityFactory";
import {PersonRegisterActions} from "../../src/action/individual/PersonRegisterActions";
import ConceptService from "../../src/service/ConceptService";

describe('PersonRegisterActionsAbhaTest', () => {
    const male = {uuid: 'g-m', name: 'Male'};
    const female = {uuid: 'g-f', name: 'Female'};
    const abhaNumberConcept = EntityFactory.createConcept('ABHA Number', Concept.dataType.Text);
    const abhaAddressConcept = EntityFactory.createConcept('ABHA Address', Concept.dataType.Text);
    let calls;

    const newState = () => {
        const state = {genders: [male, female], individual: {observations: []}};
        state.clone = () => state;
        return state;
    };
    const contextWith = (conceptsByName) => ({
        get: (service) => service === ConceptService ? {getConceptByName: (name) => conceptsByName[name]} : undefined
    });
    const record = (handler) => jest.spyOn(PersonRegisterActions, handler).mockImplementation((state, action) => {
        calls[handler] = action.value;
        return state;
    });

    beforeEach(() => {
        calls = {};
        ['enterFirstName', 'enterMiddleName', 'enterLastName', 'enterIndividualDOB', 'enterIndividualGender'].forEach(record);
    });

    afterEach(() => jest.restoreAllMocks());

    it('fills the first page through the field handlers and stores the ABHA identity', () => {
        const dateOfBirth = new Date(1990, 3, 23);
        const state = PersonRegisterActions.onAbhaProfile(newState(), {
            profile: {firstName: 'Asha', middleName: null, lastName: 'Rao', genderName: 'Female', dateOfBirth,
                abhaNumber: '91-1234-5678-9012', abhaAddress: 'asha.rao@sbx'}
        }, contextWith({'ABHA Number': abhaNumberConcept, 'ABHA Address': abhaAddressConcept}));

        expect(calls).to.deep.equal({enterFirstName: 'Asha', enterLastName: 'Rao', enterIndividualDOB: dateOfBirth, enterIndividualGender: female});
        const stored = state.individual.observations.map(obs => [obs.concept.name, obs.getValue()]);
        expect(stored).to.deep.equal([['ABHA Number', '91-1234-5678-9012'], ['ABHA Address', 'asha.rao@sbx']]);
    });

    it('skips a gender Avni does not have and concepts the form does not use', () => {
        const state = PersonRegisterActions.onAbhaProfile(newState(), {
            profile: {firstName: 'Ravi', genderName: null, abhaNumber: '91-0000-0000-0000', abhaAddress: 'ravi@sbx'}
        }, contextWith({'ABHA Number': abhaNumberConcept}));

        expect(calls).to.deep.equal({enterFirstName: 'Ravi'});
        expect(state.individual.observations.map(obs => obs.concept.name)).to.deep.equal(['ABHA Number']);
    });
});
