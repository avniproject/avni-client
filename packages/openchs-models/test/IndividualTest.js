import {expect} from 'chai';
import moment from "moment";
import Individual from "../src/Individual";
import Program from "../src/Program";
import ProgramEnrolment from "../src/ProgramEnrolment";

let createProgram = function (uuid) {
    const program = new Program();
    program.uuid = uuid;
    return program;
};

let createEnrolment = function (program) {
    const programEnrolment = new ProgramEnrolment();
    programEnrolment.program = program;
    return programEnrolment
};

describe('IndividualTest', () => {
    it('getDisplayAge', () => {
        var individual = new Individual();
        individual.dateOfBirth = '1981-01-01';
        expect(individual.getAge().toString()).contains("years");
    });

    it('eligiblePrograms', () => {
        const enroledProgram = createProgram("1d5c6d3a-f8c1-4f2a-922b-e02c30f748c7");
        const allPrograms = [createProgram("8945c920-8ef0-4a22-ab4b-a153a44f8fc1"), createProgram("71a2d192-dea9-4d3b-bd4e-a6403a40e979"), enroledProgram];
        const individual = new Individual();
        individual.enrolments = [createEnrolment(enroledProgram)];
        expect(individual.eligiblePrograms(allPrograms).length).is.equal(2);
    });

    describe("getAge", () => {
        it ("sets years based on age of the individual", () => {
            expect(new Individual().getAge().isInYears).to.be.true;


            let individual = new Individual();
            individual.dateOfBirth = moment().subtract(2, 'months');
            expect(individual.getAge().isInYears).to.be.false;

            individual = new Individual();
            individual.dateOfBirth = moment().subtract(2, 'years');
            expect(individual.getAge().isInYears).to.be.true;

            //this is current behaviour because the place it is used in registering individuals does not have weeks.
            individual = new Individual();
            individual.dateOfBirth = moment().subtract(2, 'weeks');
            expect(individual.getAge().isInYears).to.be.true;
        });
    });

});