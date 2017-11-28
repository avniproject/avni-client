import {assert} from "chai";
import ProgramEncounter from "../src/ProgramEncounter";
import ProgramEnrolment from "../src/ProgramEnrolment";
import ValidationResultsInspector from "./ValidationResultsInspector";

describe('ProgramEncounterTest', () => {
    it('validate', () => {
        const programEncounter = ProgramEncounter.createEmptyInstance();
        programEncounter.programEnrolment = ProgramEnrolment.createEmptyInstance();
        programEncounter.encounterDateTime = null;

        var validationResults = programEncounter.validate();
        assert.equal(ValidationResultsInspector.numberOfErrors(validationResults),1);

        programEncounter.programEnrolment.enrolmentDateTime = new Date(2017, 0, 0, 5);
        programEncounter.encounterDateTime = new Date(2016, 0, 0);
        validationResults = programEncounter.validate();
        assert.equal(ValidationResultsInspector.numberOfErrors(validationResults),1);

        programEncounter.encounterDateTime = new Date(2017, 1, 0);
        validationResults = programEncounter.validate();
        assert.equal(ValidationResultsInspector.numberOfErrors(validationResults),0);

        //ignore time differences
        programEncounter.encounterDateTime = new Date(2017, 0, 0, 3);
        validationResults = programEncounter.validate();
        assert.equal(ValidationResultsInspector.numberOfErrors(validationResults),0);
    });
});