import ProgramFactory from "../../openchs-models/test/ref/ProgramFactory";
import IndividualBuilder from "../../openchs-models/test/ref/IndividualBuilder";
import program from "../health_modules/child/metadata/childProgram.json";
import childConcepts from "../health_modules/child/metadata/concepts.json";
import commonConcepts from "../health_modules/commonConcepts.json";
import enrolmentForm from "../health_modules/child/metadata/childProgramEnrolmentForm.json";
import birthForm from "../health_modules/child/metadata/birthForm";
import EnrolmentFiller from "../../openchs-models/test/ref/EnrolmentFiller";
import EncounterFiller from "../../openchs-models/test/ref/EncounterFiller";
import TestHelper from "./TestHelper";

const assert = require('chai').assert;
const _ = require('lodash');
const childEncounterDecision = require('../health_modules/child/childProgramEncounterDecision');
const C = require('../health_modules/common');

describe("Child Program Birth", () => {
    let programData, enrolment, individual, lmpDate,
        decisions, protoBirthEncounter;

    beforeEach(() => {
        programData = new ProgramFactory(program)
            .withConcepts(commonConcepts)
            .withConcepts(childConcepts)
            .withEnrolmentform(enrolmentForm)
            .withEncounterForm(birthForm)
            .build();
        individual = new IndividualBuilder(programData)
            .withName("Test", "Child")
            .withAge(1)
            .withGender("Female")
            .withSingleCodedObservation("Blood group", "B+")
            .build();
        enrolment = new EnrolmentFiller(programData, individual, new Date())
            .build();
        decisions = { encounterDecisions: [], encounterDecisions: [] };
        protoBirthEncounter = new EncounterFiller(programData, enrolment, "Birth", new Date());
    });


    describe("High Risk Condition", () => {
        [{ concept: "Cried soon after birth", value: "No", riskName: "Did not cry soon after birth" },
        { concept: "Breast feeding within 1 hour of birth", value: "No", riskName: "Not Breast-fed within 1 hour of birth" },
        { concept: "Colour of child", value: "Blue/pale", riskName: "Colour of child is Pale or Blue" },
        { concept: "Reflex", value: "Absent", riskName: "Reflex Absent" },
        { concept: "Jaundice (Icterus)", value: "Present", riskName: "Icterus present" },
        { concept: "Muscle tone", value: "Absent", riskName: "Muscle tone Absent/Flexed arms and legs" },
        { concept: "Muscle tone", value: "Flexed arms and legs", riskName: "Muscle tone Absent/Flexed arms and legs" }
        ].forEach((risk) => {

            it(`is added if ${risk.concept} is '${risk.value}'`, () => {
                let birthEncounter = protoBirthEncounter.forSingleCoded(risk.concept, risk.value).build();
                decisions = childEncounterDecision.getDecisions(birthEncounter, new Date());
                assert.include(TestHelper.findCodedValue(decisions.encounterDecisions, "High Risk Conditions"), risk.riskName,
                    `expected high risk conditions to include '${risk.riskName}'`);
            });

        });

        [{ concept: "Child Pulse", value: 55, riskName: "Low Pulse" },
        { concept: "Child Pulse", value: 105, riskName: "High Pulse" },
        { concept: "Child Temperature", value: 97.4, riskName: "Low Temperature" },
        { concept: "Child Temperature", value: 99.6, riskName: "High Temperature" },
        { concept: "Child Respiratory Rate", value: 29, riskName: "Low Respiratory Rate" },
        { concept: "Child Respiratory Rate", value: 61, riskName: "High Respiratory Rate" },
        { concept: "Birth Weight", value: 1.5, riskName: "Child born Underweight" }
        ].forEach((risk) => {

            it(`is added if ${risk.concept} is '${risk.value}'`, () => {
                let birthEncounter = protoBirthEncounter.forConcept(risk.concept, risk.value).build();
                decisions = childEncounterDecision.getDecisions(birthEncounter, new Date());
                assert.include(TestHelper.findCodedValue(decisions.encounterDecisions, "High Risk Conditions"), risk.riskName,
                    `expected high risk conditions to include '${risk.riskName}'`);
            });

        });
    });

    describe("Referring to the hospital immediately", () => {
        [{ concept: "Cried soon after birth", value: "No", complication: "Did not cry soon after birth" },
        { concept: "Colour of child", value: "Blue/pale", complication: "Colour of child is Pale or Blue" },
        { concept: "Reflex", value: "Absent", complication: "Reflex Absent" },
        { concept: "Muscle tone", value: "Absent", complication: "Muscle tone Absent/Flexed arms and legs" },
        { concept: "Muscle tone", value: "Flexed arms and legs", complication: "Muscle tone Absent/Flexed arms and legs" },
        { concept: "Jaundice (Icterus)", value: "Present", complication: "Icterus present" }
        ].forEach((referral) => {

            it(`is adviced if '${referral.concept}' is '${referral.value}'`, () => {
                let birthEncounter = protoBirthEncounter.forSingleCoded(referral.concept, referral.value).build();
                decisions = childEncounterDecision.getDecisions(birthEncounter, new Date());
                assert.include(TestHelper.findCodedValue(decisions.encounterDecisions, 'Refer to the hospital immediately for'), referral.complication,
                    `expected to be referred to the hospital immediately for '${referral.complication}'`);
            });

        });

        [{ concept: "Child Pulse", value: 55, complication: "Low Pulse" },
        { concept: "Child Pulse", value: 105, complication: "High Pulse" },
        { concept: "Child Temperature", value: 97.4, complication: "Low Temperature" },
        { concept: "Child Temperature", value: 99.7, complication: "High Temperature" },
        { concept: "Child Respiratory Rate", value: 29, complication: "Low Respiratory Rate" },
        { concept: "Child Respiratory Rate", value: 62, complication: "High Respiratory Rate" },
        { concept: "Birth Weight", value: 1.2, complication: "Child born Underweight" }
        ].forEach((referral) => {

            it(`is adviced if '${referral.concept}' is '${referral.value}'`, () => {
                let birthEncounter = protoBirthEncounter.forConcept(referral.concept, referral.value).build();
                decisions = childEncounterDecision.getDecisions(birthEncounter, new Date());
                assert.include(TestHelper.findCodedValue(decisions.encounterDecisions, 'Refer to the hospital immediately for'), referral.complication,
                    `expected to be referred to the hospital immediately for '${referral.complication}'`);
            });


        });
    });

    describe("Referring to the hospital", () => {
        [{ concept: "Breast feeding within 1 hour of birth", value: "No", complication: "Not Breast-fed within 1 hour of birth" }
        ].forEach((referral) => {

            it(`is adviced if '${referral.concept}' is '${referral.value}'`, () => {
                let birthEncounter = protoBirthEncounter.forSingleCoded(referral.concept, referral.value).build();
                decisions = childEncounterDecision.getDecisions(birthEncounter, new Date());
                assert.include(TestHelper.findCodedValue(decisions.encounterDecisions, 'Refer to the hospital for'), referral.complication,
                    `expected to be referred to the hospital for '${referral.complication}'`);
            });

        });

    });

});

