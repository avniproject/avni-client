import {expect, assert} from "chai";

import {
    Concept, Gender, MultipleCodedValues, Observation, PrimitiveValue, ProgramEncounter,
    ProgramEnrolment, Individual
} from "openchs-models";
import {getDecisions} from "../../../health_modules/child/anthropometricDecision";
import EntityFactory from "openchs-models/test/EntityFactory";
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