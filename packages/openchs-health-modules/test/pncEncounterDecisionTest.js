import {expect, assert} from "chai";
import {
    Concept, MultipleCodedValues, Observation, PrimitiveValue, ProgramEncounter,
    ProgramEnrolment
} from "openchs-models";
import {getDecisions} from "../health_modules/mother/pncEncounterDecision";
import * as C from "../health_modules/common";
import EntityFactory from "openchs-models/test/EntityFactory";
import TestHelper from "./TestHelper";


describe("PNC encounter decisions", () => {
    var programEncounter;

    const pncComplications = (decisions) =>{
        return TestHelper.findCodedValue(decisions.encounterDecisions, "PNC Complications");
    };

    const treatmentAdvice = (decisions) =>{
        return C.findValue(decisions.encounterDecisions, "Treatment Advice");
    };

    beforeEach(() => {
        programEncounter = ProgramEncounter.createEmptyInstance();
        programEncounter.programEnrolment = ProgramEnrolment.createEmptyInstance();
    });

    it("creates decisions for pnc encounters", () => {
        let programEncounter = ProgramEncounter.createEmptyInstance();
        let decisions = getDecisions(programEncounter);
        expect(decisions).to.have.all.keys("enrolmentDecisions", "encounterDecisions", "registrationDecisions");
    });

    it("refers to FRU for further investigation if there are any problems", () => {
        let programEncounter = ProgramEncounter.createEmptyInstance();
        const temperatureConcept = EntityFactory.createConcept("Temperature", Concept.dataType.Numeric);
        const highTemperatureObs = Observation.create(temperatureConcept, new PrimitiveValue(102, Concept.dataType.Numeric));

        programEncounter.observations.push(highTemperatureObs);
        let decisions = getDecisions(programEncounter);
        expect(treatmentAdvice(decisions)).to.equal("Refer to FRU for further checkup");
    });

    describe("Post-Partum Haemorrhage", () => {
        var vaginalProblemsConcept, systolicConcept, diastolicConcept, otherDifficultiesConcept;

        beforeEach(() => {
            vaginalProblemsConcept = EntityFactory.createConcept("Any vaginal problems", Concept.dataType.Coded);
            EntityFactory.addCodedAnswers(vaginalProblemsConcept, ["Heavy bleeding per vaginum", "Bad-smelling lochia", "Infected perineum suture", "No problems"]);

            otherDifficultiesConcept = EntityFactory.createConcept("Post-Partum Haemorrhage symptoms", Concept.dataType.Coded);
            EntityFactory.addCodedAnswers(otherDifficultiesConcept, ["Difficulty breathing", "Bad headache", "Blurred vision", "No problem"]);

            systolicConcept = EntityFactory.createConcept("Systolic", Concept.dataType.Numeric);
            diastolicConcept = EntityFactory.createConcept("Diastolic", Concept.dataType.Numeric);
        });

        it("is added when there is bad smelling lochia", () => {
            const vaginalProblemsObs = Observation.create(vaginalProblemsConcept, new MultipleCodedValues());
            vaginalProblemsObs.toggleMultiSelectAnswer(vaginalProblemsConcept.getPossibleAnswerConcept("Bad-smelling lochia").concept.uuid);
            programEncounter.observations.push(vaginalProblemsObs);


            const decisions = getDecisions(programEncounter);

            const encounterDecisions = decisions.encounterDecisions;
            const pncComplications = TestHelper.findCodedValue(encounterDecisions, "PNC Complications");
            expect(pncComplications).to.exist;
            expect(pncComplications).to.be.an('array').with.lengthOf(1).that.includes("Post-Partum Haemorrhage");
        });

        it("is added when there is difficulty breathing, bad headache or blurred vision", () => {
            const otherDifficultiesObs = Observation.create(otherDifficultiesConcept, new MultipleCodedValues());
            otherDifficultiesObs.toggleMultiSelectAnswer(otherDifficultiesConcept.getPossibleAnswerConcept("Difficulty breathing").concept.uuid);
            programEncounter.observations.push(otherDifficultiesObs);

            let decisions = getDecisions(programEncounter);
            expect(pncComplications(decisions)).to.be.an('array').with.lengthOf(1).that.includes("Post-Partum Haemorrhage");

            otherDifficultiesObs.toggleMultiSelectAnswer(otherDifficultiesConcept.getPossibleAnswerConcept("Difficulty breathing").concept.uuid);
            otherDifficultiesObs.toggleMultiSelectAnswer(otherDifficultiesConcept.getPossibleAnswerConcept("Bad headache").concept.uuid);
            decisions = getDecisions(programEncounter);
            expect(pncComplications(decisions)).to.be.an('array').with.lengthOf(1).that.includes("Post-Partum Haemorrhage");

            otherDifficultiesObs.toggleMultiSelectAnswer(otherDifficultiesConcept.getPossibleAnswerConcept("Bad headache").concept.uuid);
            otherDifficultiesObs.toggleMultiSelectAnswer(otherDifficultiesConcept.getPossibleAnswerConcept("Blurred vision").concept.uuid);
            decisions = getDecisions(programEncounter);
            expect(pncComplications(decisions)).to.be.an('array').with.lengthOf(1).that.includes("Post-Partum Haemorrhage");

            otherDifficultiesObs.toggleMultiSelectAnswer(otherDifficultiesConcept.getPossibleAnswerConcept("Blurred vision").concept.uuid);
            decisions = getDecisions(programEncounter);
            expect(pncComplications(decisions)).to.have.lengthOf(0);

            otherDifficultiesObs.toggleMultiSelectAnswer(otherDifficultiesConcept.getPossibleAnswerConcept("No problem").concept.uuid);
            decisions = getDecisions(programEncounter);
            expect(pncComplications(decisions)).to.have.lengthOf(0);
        });

        it("is added when there is hypotension (systolic < 90 or diastolic < 60)", () => {
            const systolicObs = Observation.create(systolicConcept, new PrimitiveValue(0, Concept.dataType.Numeric));
            const diastolicObs = Observation.create(diastolicConcept, new PrimitiveValue(0, Concept.dataType.Numeric));

            programEncounter.observations.push(systolicObs);
            systolicObs.valueJSON = new PrimitiveValue(89, Concept.dataType.Numeric);
            let decisions = getDecisions(programEncounter);
            expect(pncComplications(decisions)).to.be.an('array').with.lengthOf(1).that.includes("Post-Partum Haemorrhage");

            systolicObs.valueJSON = new PrimitiveValue(90, Concept.dataType.Numeric);
            decisions = getDecisions(programEncounter);
            expect(pncComplications(decisions)).to.have.lengthOf(0);

            systolicObs.valueJSON = new PrimitiveValue(91, Concept.dataType.Numeric);
            decisions = getDecisions(programEncounter);
            expect(pncComplications(decisions)).to.have.lengthOf(0);

            diastolicObs.valueJSON = new PrimitiveValue(59, Concept.dataType.Numeric);
            programEncounter.observations = [diastolicObs];
            decisions = getDecisions(programEncounter);
            expect(pncComplications(decisions)).to.be.an('array').with.lengthOf(1).that.includes("Post-Partum Haemorrhage");

            diastolicObs.valueJSON = new PrimitiveValue(60, Concept.dataType.Numeric);
            decisions = getDecisions(programEncounter);
            expect(pncComplications(decisions)).to.have.lengthOf(0);

            diastolicObs.valueJSON = new PrimitiveValue(61, Concept.dataType.Numeric);
            decisions = getDecisions(programEncounter);
            expect(pncComplications(decisions)).to.have.lengthOf(0);
        });

    });

    describe("Urinary Tract Infection", () => {
        var abdominalProblemsConcept, difficultyUrinatingConcept;


        beforeEach(() => {
            abdominalProblemsConcept = EntityFactory.createConcept("Any abdominal problems", Concept.dataType.Coded);
            EntityFactory.addCodedAnswers(abdominalProblemsConcept, ["Uterus is soft or tender", "Abdominal pain", "No problems"]);

            difficultyUrinatingConcept = EntityFactory.createConcept("Any difficulties with urinating", Concept.dataType.Coded);
            EntityFactory.addCodedAnswers(difficultyUrinatingConcept, ["Difficulty passing urine", "Burning Urination", "No difficulties"]);
        });

        it("is added when there is lower abdominal pain, difficulty passing urine or burning sensation while urinating", () => {
            const abdominalProblemsObs = Observation.create(abdominalProblemsConcept, new MultipleCodedValues());
            abdominalProblemsObs.toggleMultiSelectAnswer(abdominalProblemsConcept.getPossibleAnswerConcept("No problems").concept.uuid);
            programEncounter.observations.push(abdominalProblemsObs);

            let decisions = getDecisions(programEncounter);
            expect(pncComplications(decisions)).to.have.lengthOf(0);

            abdominalProblemsObs.toggleMultiSelectAnswer(abdominalProblemsConcept.getPossibleAnswerConcept("Abdominal pain").concept.uuid);
            decisions = getDecisions(programEncounter);
            expect(pncComplications(decisions)).to.be.an('array').with.lengthOf(1).that.includes("Urinary Tract Infection");

            abdominalProblemsObs.toggleMultiSelectAnswer(abdominalProblemsConcept.getPossibleAnswerConcept("Abdominal pain").concept.uuid);
            const difficultyUrinatingObs = Observation.create(difficultyUrinatingConcept, new MultipleCodedValues());
            difficultyUrinatingObs.toggleMultiSelectAnswer(difficultyUrinatingConcept.getPossibleAnswerConcept("Difficulty passing urine").concept.uuid);
            programEncounter.observations.push(difficultyUrinatingObs);

            decisions = getDecisions(programEncounter);
            expect(pncComplications(decisions)).to.be.an('array').with.lengthOf(1).that.includes("Urinary Tract Infection");
        });
    });

    describe("Genital Tract Infection", () => {

        var abdominalProblemsConcept, vaginalProblemsConcept;

        beforeEach(() => {
            abdominalProblemsConcept = EntityFactory.createConcept("Any abdominal problems", Concept.dataType.Coded);
            EntityFactory.addCodedAnswers(abdominalProblemsConcept, ["Uterus is soft or tender", "Abdominal pain", "No problems"]);

            vaginalProblemsConcept = EntityFactory.createConcept("Any vaginal problems", Concept.dataType.Coded);
            EntityFactory.addCodedAnswers(vaginalProblemsConcept, ["Heavy bleeding per vaginum", "Bad-smelling lochia", "Infected perineum suture", "No problems"]);
        });

        it("is added when there is soft or tender uterus", () => {
            const abdominalProblemsObs = Observation.create(abdominalProblemsConcept, new MultipleCodedValues());
            abdominalProblemsObs.toggleMultiSelectAnswer(abdominalProblemsConcept.getPossibleAnswerConcept("Uterus is soft or tender").concept.uuid);
            programEncounter.observations.push(abdominalProblemsObs);

            let decisions = getDecisions(programEncounter);
            expect(pncComplications(decisions)).to.be.an('array').with.lengthOf(1).that.includes("Genital Tract Infection");
        });

        it("is added when there is heavy bleeding", () => {
            const vaginalProblemsObs = Observation.create(vaginalProblemsConcept, new MultipleCodedValues());
            vaginalProblemsObs.toggleMultiSelectAnswer(vaginalProblemsConcept.getPossibleAnswerConcept("Heavy bleeding per vaginum").concept.uuid);
            programEncounter.observations.push(vaginalProblemsObs);

            let decisions = getDecisions(programEncounter);
            expect(pncComplications(decisions)).to.be.an('array').with.lengthOf(1).that.includes("Genital Tract Infection");
        });
    });

    describe("Mastitis", () => {
        var breastProblemsConcept;

        beforeEach(() => {
            breastProblemsConcept = EntityFactory.createConcept("Any breast problems", Concept.dataType.Coded);
            EntityFactory.addCodedAnswers(breastProblemsConcept, ["Breast hardness", "Nipple hardness", "Cracked Nipple", "No problem"]);
        });

        it("is added when there is breast hardness, nipple hardness or cracked nipple", () => {
            const breastProblemsObs = Observation.create(breastProblemsConcept, new MultipleCodedValues());
            breastProblemsObs.toggleMultiSelectAnswer(breastProblemsConcept.getPossibleAnswerConcept("Breast hardness").concept.uuid);
            programEncounter.observations.push(breastProblemsObs);

            let decisions = getDecisions(programEncounter);
            expect(pncComplications(decisions)).to.be.an('array').with.lengthOf(1).that.includes("Mastitis");
        });
    });

    describe("Post operative infection", () => {
        var cesareanIncisionAreaConcept;

        beforeEach(() => {
            cesareanIncisionAreaConcept = EntityFactory.createConcept("How is the Cesarean incision area", Concept.dataType.Coded);
            EntityFactory.addCodedAnswers(cesareanIncisionAreaConcept, ["Normal", "Looks red", "Indurated", "Filled with pus"]);
        });

        it("is added when the cesarean incision area is not normal", () => {
            const cesareanAreaIncisionAreaObs = Observation.create(cesareanIncisionAreaConcept, new MultipleCodedValues());
            cesareanAreaIncisionAreaObs.toggleMultiSelectAnswer(cesareanIncisionAreaConcept.getPossibleAnswerConcept("Looks red").concept.uuid);
            programEncounter.observations.push(cesareanAreaIncisionAreaObs);

            let decisions = getDecisions(programEncounter);
            expect(pncComplications(decisions)).to.be.an('array').with.lengthOf(1).that.includes("Post Operative Infection");
        });
    });

    describe("Infection", () => {
        var cesareanIncisionAreaConcept, temperatureConcept, systolicConcept;

        beforeEach(() => {
            cesareanIncisionAreaConcept = EntityFactory.createConcept("How is the Cesarean incision area", Concept.dataType.Coded);
            EntityFactory.addCodedAnswers(cesareanIncisionAreaConcept, ["Normal", "Looks red", "Indurated", "Filled with pus"]);

            temperatureConcept = EntityFactory.createConcept("Temperature", Concept.dataType.Numeric);
            systolicConcept = EntityFactory.createConcept("Systolic", Concept.dataType.Numeric);
        });

        it("is added when there is temperature above 99 degrees fahreinheit", () => {
            const highTemperatureObs = Observation.create(temperatureConcept, new PrimitiveValue(100, Concept.dataType.Numeric));
            programEncounter.observations.push(highTemperatureObs);

            let decisions = getDecisions(programEncounter);
            expect(pncComplications(decisions)).to.be.an('array').with.lengthOf(1).that.includes("Infection");
        });

        it("is not added when there is temperature above 99 degrees fahreinheit but there is Post-Partum Haemorrhage, " +
            "Urinary Tract Infection, Genital Tract Infection, Mastitis or Post Operative Infection", () => {
            const highTemperatureObs = Observation.create(temperatureConcept, new PrimitiveValue(100, Concept.dataType.Numeric));
            programEncounter.observations.push(highTemperatureObs);

            const systolicObs = Observation.create(systolicConcept, new PrimitiveValue(40, Concept.dataType.Numeric));
            programEncounter.observations.push(systolicObs);

            let decisions = getDecisions(programEncounter);
            expect(pncComplications(decisions)).to.be.an('array').with.lengthOf(1).that.includes("Post-Partum Haemorrhage");
        });
    });

    describe("Post-Partum Depression", () => {
        it("is added when there is insomnia, loss of appetite, weakness or irritability", () => {
            const complaintsConcept = EntityFactory.createConcept("Post-Partum Depression Symptoms", Concept.dataType.Coded);
            EntityFactory.addCodedAnswers(complaintsConcept, ["Insomnia", "Loss of appetite", "Weakness", "Irritability"]);

            const complaintsObs = Observation.create(complaintsConcept, new MultipleCodedValues());
            complaintsObs.toggleMultiSelectAnswer(complaintsConcept.getPossibleAnswerConcept("Insomnia").concept.uuid);
            programEncounter.observations.push(complaintsObs);

            let decisions = getDecisions(programEncounter);
            expect(pncComplications(decisions)).to.be.an('array').with.lengthOf(1).that.includes("Post-Partum Depression");

            complaintsObs.toggleMultiSelectAnswer(complaintsConcept.getPossibleAnswerConcept("Insomnia").concept.uuid);
            decisions = getDecisions(programEncounter);
            expect(pncComplications(decisions)).to.empty;

            complaintsObs.toggleMultiSelectAnswer(complaintsConcept.getPossibleAnswerConcept("Loss of appetite").concept.uuid);
            decisions = getDecisions(programEncounter);
            expect(pncComplications(decisions)).to.be.an('array').with.lengthOf(1).that.includes("Post-Partum Depression");

            complaintsObs.toggleMultiSelectAnswer(complaintsConcept.getPossibleAnswerConcept("Loss of appetite").concept.uuid);
            complaintsObs.toggleMultiSelectAnswer(complaintsConcept.getPossibleAnswerConcept("Weakness").concept.uuid);
            decisions = getDecisions(programEncounter);
            expect(pncComplications(decisions)).to.be.an('array').with.lengthOf(1).that.includes("Post-Partum Depression");

            complaintsObs.toggleMultiSelectAnswer(complaintsConcept.getPossibleAnswerConcept("Weakness").concept.uuid);
            complaintsObs.toggleMultiSelectAnswer(complaintsConcept.getPossibleAnswerConcept("Irritability").concept.uuid);
            decisions = getDecisions(programEncounter);
            expect(pncComplications(decisions)).to.be.an('array').with.lengthOf(1).that.includes("Post-Partum Depression");

            complaintsObs.toggleMultiSelectAnswer(complaintsConcept.getPossibleAnswerConcept("Loss of appetite").concept.uuid);
            decisions = getDecisions(programEncounter);
            expect(pncComplications(decisions)).to.be.an('array').with.lengthOf(1).that.includes("Post-Partum Depression");
        });
    });

    describe("Post-Partum Eclampsia", () => {

        it("is added when there is high BP and convulsions", () => {
            const systolicConcept = EntityFactory.createConcept("Systolic", Concept.dataType.Numeric);
            const diastolicConcept = EntityFactory.createConcept("Diastolic", Concept.dataType.Numeric);
            const convulsionsConcept = EntityFactory.createConcept("Convulsions", Concept.dataType.Coded);
            EntityFactory.addCodedAnswers(convulsionsConcept, ["Present", "Absent"]);

            const systolicObs = Observation.create(systolicConcept, new PrimitiveValue(0, Concept.dataType.Numeric));
            const diastolicObs = Observation.create(diastolicConcept, new PrimitiveValue(0, Concept.dataType.Numeric));
            const convulsionsObs = Observation.create(convulsionsConcept, new MultipleCodedValues());

            systolicObs.valueJSON = new PrimitiveValue(140, Concept.dataType.Numeric);
            diastolicObs.valueJSON = new PrimitiveValue(90, Concept.dataType.Numeric);
            convulsionsObs.toggleMultiSelectAnswer(convulsionsConcept.getPossibleAnswerConcept("Present").concept.uuid);
            programEncounter.observations.push(systolicObs);
            programEncounter.observations.push(diastolicObs);
            programEncounter.observations.push(convulsionsObs);

            let decisions = getDecisions(programEncounter);
            expect(pncComplications(decisions)).to.be.an('array').with.lengthOf(1).that.includes("Post-Partum Eclampsia");

            //normal systolic,
            systolicObs.valueJSON = new PrimitiveValue(110, Concept.dataType.Numeric);
            diastolicObs.valueJSON = new PrimitiveValue(90, Concept.dataType.Numeric);
            decisions = getDecisions(programEncounter);
            expect(pncComplications(decisions)).to.be.an('array').with.lengthOf(1).that.includes("Post-Partum Eclampsia");

            //high bp, no convulsions
            systolicObs.valueJSON = new PrimitiveValue(110, Concept.dataType.Numeric);
            diastolicObs.valueJSON = new PrimitiveValue(90, Concept.dataType.Numeric);
            convulsionsObs.toggleMultiSelectAnswer(convulsionsConcept.getPossibleAnswerConcept("Present").concept.uuid);
            decisions = getDecisions(programEncounter);
            expect(pncComplications(decisions)).to.be.empty;

            //only convulsions obs
            programEncounter.observations = [convulsionsObs];
            decisions = getDecisions(programEncounter);
            expect(pncComplications(decisions)).to.be.empty;

            //convulsions and high systolic, no diastolic observation
            systolicObs.valueJSON = new PrimitiveValue(150, Concept.dataType.Numeric);
            convulsionsObs.toggleMultiSelectAnswer(convulsionsConcept.getPossibleAnswerConcept("Present").concept.uuid);
            programEncounter.observations = [systolicObs, convulsionsObs];
            decisions = getDecisions(programEncounter);
            expect(pncComplications(decisions)).to.be.an('array').with.lengthOf(1).that.includes("Post-Partum Eclampsia");

            systolicObs.valueJSON = new PrimitiveValue(110, Concept.dataType.Numeric);
            diastolicObs.valueJSON = new PrimitiveValue(91, Concept.dataType.Numeric);
            programEncounter.observations = [systolicObs, diastolicObs, convulsionsObs];
            decisions = getDecisions(programEncounter);
            expect(pncComplications(decisions)).to.be.an('array').with.lengthOf(1).that.includes("Post-Partum Eclampsia");
        });
    });
});