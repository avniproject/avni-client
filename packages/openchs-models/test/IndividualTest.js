import {assert} from "chai";
import EntityFactory from "./EntityFactory";
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
        assert.include(individual.getAge().toString(), "years");
    });

    it('eligiblePrograms', () => {
        const enroledProgram = EntityFactory.createProgram({});
        const allPrograms = [EntityFactory.createProgram({}), EntityFactory.createProgram({}), enroledProgram];
        const individual = new Individual();
        individual.enrolments = [createEnrolment(enroledProgram)];
        assert.equal(individual.eligiblePrograms(allPrograms).length, 2);
    });

    it ("sets years based on age of the individual", () => {
        assert.isTrue(new Individual().getAge().isInYears);

        let individual = new Individual();
        individual.dateOfBirth = moment().subtract(2, 'months');
        assert.isFalse(individual.getAge().isInYears);

        individual = new Individual();
        individual.dateOfBirth = moment().subtract(2, 'years');
        assert.isTrue(individual.getAge().isInYears);

        //this is current behaviour because the place it is used in registering individuals does not have weeks.
        individual = new Individual();
        individual.dateOfBirth = moment().subtract(2, 'weeks');
        assert.isTrue(individual.getAge().isInYears);
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
        assert.equal(individual.getPreviousEnrolment('FooProgram', programEnrolment4.uuid), programEnrolment3);
        assert.equal(individual.getPreviousEnrolment('FooProgram', programEnrolment3.uuid), programEnrolment1);
        assert.equal(individual.getPreviousEnrolment('FooProgram', programEnrolment1.uuid), null);
        assert.equal(individual.getPreviousEnrolment('BarProgram', programEnrolment2.uuid), null);
    });

    it('getAgeInDays', () => {
        var individual = new Individual();
        individual.dateOfBirth = "1986-06-22";
        assert.equal(individual.getAgeInDays("1986-07-31"), 39);
    });
});