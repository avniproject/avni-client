import {expect} from 'chai';
import _ from "lodash";
import ProgramEnrolment from "../../js/models/ProgramEnrolment";
import TestContext from "../views/testframework/TestContext";
import ConceptService from "../../js/service/ConceptService";

describe('ProgramEnrolmentTest', () => {
    it('mergeChecklists', () => {
        const testContext = new TestContext([{name: 'A1'}]);
        const enrolment = ProgramEnrolment.createEmptyInstance();
        const expectedChecklists = [{name: 'Vaccination', items: [{name: 'A1', dueDate: new Date(), maxDate: new Date()}]}];
        const checklists = enrolment.createChecklists(expectedChecklists, testContext.get(ConceptService));
        expect(checklists.length).is.equal(1);
    });
});