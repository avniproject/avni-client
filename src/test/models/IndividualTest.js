import {expect} from "chai";
import Individual from "../../js/models/Individual";
import ProgramEnrolment from "../../js/models/ProgramEnrolment";
import moment from "moment";
import EntityFactory from "./EntityFactory";

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
        const enroledProgram = EntityFactory.createProgram({});
        const allPrograms = [EntityFactory.createProgram({}), EntityFactory.createProgram({}), enroledProgram];
        const individual = new Individual();
        individual.enrolments = [createEnrolment(enroledProgram)];
        expect(individual.eligiblePrograms(allPrograms).length).is.equal(2);
    });

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

    it('previousEnrolment', () => {
        const individual = Individual.createEmptyInstance();

        let addEnrolment = function (enrolment) {
            individual.addEnrolment(enrolment);
            return enrolment;
        };

        const program1 = EntityFactory.createProgram({name: 'FooProgram'});
        const program2 = EntityFactory.createProgram({name: 'BarProgram'});
        const programEnrolment1 = addEnrolment(EntityFactory.createEnrolment({program: program1, enrolmentDateTime: new Date(2010, 1, 1)}));
        const programEnrolment2 = addEnrolment(EntityFactory.createEnrolment({program: program2, enrolmentDateTime: new Date(2012, 1, 1)}));
        const programEnrolment3 = addEnrolment(EntityFactory.createEnrolment({program: program1, enrolmentDateTime: new Date(2014, 1, 1)}));
        const programEnrolment4 = addEnrolment(EntityFactory.createEnrolment({program: program1, enrolmentDateTime: new Date(2017, 1, 1)}));
        expect(individual.getPreviousEnrolment('FooProgram', programEnrolment4.uuid)).is.equal(programEnrolment3);
        expect(individual.getPreviousEnrolment('FooProgram', programEnrolment3.uuid)).is.equal(programEnrolment1);
        expect(individual.getPreviousEnrolment('FooProgram', programEnrolment1.uuid)).is.equal(null);
        expect(individual.getPreviousEnrolment('BarProgram', programEnrolment2.uuid)).is.equal(null);
    });
});