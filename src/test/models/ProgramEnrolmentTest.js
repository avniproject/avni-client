import {expect} from "chai";
import ProgramEnrolment from "../../js/models/ProgramEnrolment";
import TestContext from "../views/testframework/TestContext";
import ConceptService from "../../js/service/ConceptService";
import ProgramEncounter from "../../js/models/ProgramEncounter";

describe('ProgramEnrolmentTest', () => {
    it('mergeChecklists', () => {
        const testContext = new TestContext([{name: 'A1'}]);
        const enrolment = ProgramEnrolment.createEmptyInstance();
        const expectedChecklists = [{name: 'Vaccination', items: [{name: 'A1', dueDate: new Date(), maxDate: new Date()}]}];
        const checklists = enrolment.createChecklists(expectedChecklists, testContext.get(ConceptService));
        expect(checklists.length).is.equal(1);
    });

    it('getEncounters', () => {
        const enrolment = ProgramEnrolment.createEmptyInstance();

        enrolment.addEncounter(createEncounter(new Date(2017, 3, 1)));
        const newest = createEncounter(new Date(2017, 4, 1));
        enrolment.addEncounter(newest);
        enrolment.addEncounter(createEncounter(new Date(2017, 2, 1)));

        expect(enrolment.getEncounters()[0].uuid).is.equal(newest.uuid);
    });

    function createEncounter(date) {
        const encounter = ProgramEncounter.createEmptyInstance();
        encounter.encounterDateTime = date;
        return encounter;
    }
});