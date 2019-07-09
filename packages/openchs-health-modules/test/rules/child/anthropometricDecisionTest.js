import {assert} from "chai";
import _ from "lodash";

import {
    Concept, Gender, Observation, PrimitiveValue, ProgramEncounter,
    ProgramEnrolment, Individual
} from 'openchs-models';
import {getDecisions} from "../../../health_modules/child/anthropometricDecision";
import EntityFactory from "../../helpers/EntityFactory";
import moment from "moment";
import C from "../../../health_modules/common";

describe("Anthropometric Decisions", () => {
    let programEncounter, girl, boy, weightConcept, heightConcept;

    beforeEach(()=> {
        programEncounter = ProgramEncounter.createEmptyInstance();
        programEncounter.programEnrolment = ProgramEnrolment.createEmptyInstance();

        const MALE = new Gender();
        const FEMALE = new Gender();
        MALE.name = 'Male';
        FEMALE.name = 'Female';
        girl = Individual.newInstance("5aab53df-d598-45c1-9528-48dd1abd4927", "Nisha",  "Rajendran", moment(), true, FEMALE);
        boy = Individual.newInstance("3f28bb80-d7ae-4e0c-8b1d-56e371f23f37", "Ramesh",  "Srivastava", moment(), true, MALE);

        weightConcept = EntityFactory.createConcept("Weight", Concept.dataType.Numeric);
        heightConcept = EntityFactory.createConcept("Height", Concept.dataType.Numeric);
    });

    it("are made when child program encounter is completed", () => {
        girl.dateOfBirth = moment();
        programEncounter.programEnrolment.individual = girl;

        let decisions = getDecisions(programEncounter);
        assert.hasAllKeys(decisions, ["enrolmentDecisions", "encounterDecisions", "registrationDecisions"]);
    });

    it("calculates z-scores for weight for age, height for age and weight for height", () => {
        girl.dateOfBirth = moment();
        programEncounter.programEnrolment.individual = girl;

        const weightObs = Observation.create(weightConcept, new PrimitiveValue(3.2, Concept.dataType.Numeric));
        programEncounter.observations.push(weightObs);

        const heightObs = Observation.create(heightConcept, new PrimitiveValue(49.1, Concept.dataType.Numeric));
        programEncounter.observations.push(heightObs);

        let decisions = getDecisions(programEncounter).encounterDecisions;
        assert.equal(C.findValue(decisions, "Weight for age z-score"), -0.1);
        assert.equal(C.findValue(decisions, "Height for age z-score"), 0);
        assert.equal(C.findValue(decisions, "Weight for height z-score"), 0.2);
    });

    it("calculates growth faltering status", () => {
        let decisions;
        let enrolment = ProgramEnrolment.createEmptyInstance();
        boy.dateOfBirth = new Date("January 19, 2018");
        enrolment.individual = boy;

        let [firstEncounter, secondEncounter, thirdEncounter, fourthEncounter] =
            _.times(4, () => ProgramEncounter.createEmptyInstance());
        let encounters = [firstEncounter, secondEncounter, thirdEncounter, fourthEncounter];
        encounters.forEach(e => e.programEnrolment = enrolment);

        let sd2Neg = 4.3;
        firstEncounter.encounterDateTime = moment(boy.dateOfBirth)
            .add(2, "months")
            .add(0, "days")
            .toDate();
        firstEncounter.observations.push(
            Observation.create(weightConcept, new PrimitiveValue(sd2Neg + 0.1, Concept.dataType.Numeric))
        );
        enrolment.addEncounter(firstEncounter);
        assert.equal(_.first(C.findValue(getDecisions(firstEncounter).encounterDecisions, "Growth Faltering Status")), "No");

        sd2Neg = 5.6;
        secondEncounter.encounterDateTime = moment(boy.dateOfBirth)
            .add(4, "months")
            .add(4, "days")
            .toDate();
        secondEncounter.observations.push(
            Observation.create(weightConcept, new PrimitiveValue(sd2Neg - 0.2, Concept.dataType.Numeric))
        );
        enrolment.addEncounter(secondEncounter);
        assert.equal(_.first(C.findValue(getDecisions(secondEncounter).encounterDecisions, "Growth Faltering Status")), "No");

        sd2Neg = 6;
        thirdEncounter.encounterDateTime = moment(boy.dateOfBirth)
            .add(5, "months")
            .add(2, "days")
            .toDate();
        thirdEncounter.observations.push(
            Observation.create(weightConcept, new PrimitiveValue(sd2Neg + 0.2, Concept.dataType.Numeric))
        );
        enrolment.addEncounter(thirdEncounter);
        assert.equal(_.first(C.findValue(getDecisions(thirdEncounter).encounterDecisions, "Growth Faltering Status")), "No");

        sd2Neg = 6.7;
        fourthEncounter.encounterDateTime = moment(boy.dateOfBirth)
            .add(7, "months")
            .add(8, "days")
            .toDate();
        fourthEncounter.observations.push(
            Observation.create(weightConcept, new PrimitiveValue(sd2Neg - 0.1, Concept.dataType.Numeric))
        );
        enrolment.addEncounter(fourthEncounter);
        assert.equal(_.first(C.findValue(getDecisions(fourthEncounter).encounterDecisions, "Growth Faltering Status")), "Yes");
    });

    it("does not calculate if values not available", () => {
        girl.dateOfBirth = moment();
        programEncounter.programEnrolment.individual = girl;

        //weight obs not provided
        // const weightObs = Observation.create(weightConcept, new PrimitiveValue(3.2, Concept.dataType.Numeric));
        // programEncounter.observations.push(weightObs);

        const heightObs = Observation.create(heightConcept, new PrimitiveValue(49.1, Concept.dataType.Numeric));
        programEncounter.observations.push(heightObs);

        let decisions = getDecisions(programEncounter).encounterDecisions;
        assert.isNull(C.findValue(decisions, "Weight for age z-score"));
        assert.equal(C.findValue(decisions, "Height for age z-score"), 0);
        assert.isNull(C.findValue(decisions, "Weight for height z-score"));
    });
});