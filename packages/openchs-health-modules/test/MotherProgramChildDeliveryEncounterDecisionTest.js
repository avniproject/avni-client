import ProgramFactory from "./ref/ProgramFactory";
import IndividualBuilder from "./ref/IndividualBuilder";
import program from "../health_modules/mother/metadata/motherProgram.json";
import motherConcepts from "../health_modules/mother/metadata/motherConcepts.json";
import commonConcepts from "../health_modules/commonConcepts.json";
import enrolmentForm from "../health_modules/mother/metadata/motherProgramEnrolmentForm.json";
import childDeliveryForm from "../health_modules/mother/metadata/childDeliveryForm";
import EnrolmentFiller from "./ref/EnrolmentFiller";
import EncounterFiller from "./ref/EncounterFiller";

const moment = require('moment');
const assert = require('chai').assert;
const _ = require('lodash');
const motherEncounterDecision = require('../health_modules/mother/motherProgramEncounterDecision');
const C = require('../health_modules/common');

describe("Mother Program Child Delivery", () => {
    let programData, enrolment, individual, lmpDate,
        decisions, protoChildDeliveryEncounter;

    beforeEach(() => {
        programData = new ProgramFactory(program)
            .withConcepts(commonConcepts)
            .withConcepts(motherConcepts)
            .withEnrolmentform(enrolmentForm)
            .withEncounterForm(childDeliveryForm)
            .build();
        individual = new IndividualBuilder(programData)
            .withName("Test", "Mother")
            .withAge(25)
            .withGender("Female")
            .withSingleCodedObservation("Blood group", "B+")
            .build();
        lmpDate = moment().subtract(1, 'months').toDate();
        enrolment = new EnrolmentFiller(programData, individual, new Date())
            .forConcept("Last menstrual period", lmpDate)
            .build();
        decisions = { encounterDecisions: [], encounterDecisions: [] };
        protoChildDeliveryEncounter = new EncounterFiller(programData, enrolment, "Child Delivery", new Date())
            .forConcept("Date of delivery", moment(lmpDate).add(37, 'weeks').toDate())
    });

    describe('Unit tests', function () {
        it('show "Gestational age category at birth" in System Recommendations', function () {
            let childDeliveryEncounter = protoChildDeliveryEncounter.build();

            decisions = motherEncounterDecision.getDecisions(childDeliveryEncounter, new Date());
            assert.isNotEmpty(C.findValue(decisions.encounterDecisions, "Gestational age category at birth"))
        });
    });


    describe("High Risk Condition", () => {
        [{ concept: "Cried soon after birth", value: "No", riskName: "Did not cry soon after birth" },
        { concept: "Breast feeding within 1 hour of birth", value: "No", riskName: "Not Breast-fed within 1 hour of birth" },
        { concept: "Colour of child", value: "Blue/pale", riskName: "Colour of child is Pale or Blue" },
        { concept: "Reflex", value: "Absent", riskName: "Reflex Absent" },
        { concept: "Jaundice (Icterus)", value: "Present", riskName: "Icterus Present" },
        { concept: "Muscle tone", value: "Absent", riskName: "Muscle tone Absent/Flexed arms and legs" },
        { concept: "Muscle tone", value: "Flexed arms and legs", riskName: "Muscle tone Absent/Flexed arms and legs" }
        ].forEach((risk) => {

            it(`is added if ${risk.concept} is '${risk.value}'`, () => {
                let childDeliveryEncounter = protoChildDeliveryEncounter.forSingleCoded(risk.concept, risk.value).build();
                decisions = motherEncounterDecision.getDecisions(childDeliveryEncounter, new Date());
                assert.include(C.findValue(decisions.encounterDecisions, "High Risk Conditions"), risk.riskName,
                    `expected high risk conditions to include '${risk.riskName}'`);
            });

        });

        [{ concept: "Child Pulse", value: 95, riskName: "Pulse <100 or > 160 bpm" },
        { concept: "Child Pulse", value: 165, riskName: "Pulse <100 or > 160 bpm" },
        { concept: "Child Temperature", value: 97.4, riskName: "Low Temperature" },
        { concept: "Child Temperature", value: 99.6, riskName: "High Temperature" },
        { concept: "Child Respiratory Rate", value: 29, riskName: "Respiratory Rate <30 or > 60 bpm" },
        { concept: "Child Respiratory Rate", value: 61, riskName: "Respiratory Rate <30 or > 60 bpm" },
        { concept: "Birth Weight", value: 1.5, riskName: "Child born Underweight" }
        ].forEach((risk) => {

            it(`is added if ${risk.concept} is '${risk.value}'`, () => {
                let childDeliveryEncounter = protoChildDeliveryEncounter.forConcept(risk.concept, risk.value).build();
                decisions = motherEncounterDecision.getDecisions(childDeliveryEncounter, new Date());
                assert.include(C.findValue(decisions.encounterDecisions, "High Risk Conditions"), risk.riskName,
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
        { concept: "Jaundice (Icterus)", value: "Present", complication: "Icterus Present" }
        ].forEach((referral) => {

            it(`is adviced if '${referral.concept}' is '${referral.value}'`, () => {
                let childDeliveryEncounter = protoChildDeliveryEncounter.forSingleCoded(referral.concept, referral.value).build();
                decisions = motherEncounterDecision.getDecisions(childDeliveryEncounter, new Date());
                assert.include(C.findValue(decisions.encounterDecisions, 'Refer to the hospital immediately for'), referral.complication,
                    `expected to be referred to the hospital immediately for '${referral.complication}'`);
            });

        });

        [{ concept: "Child Pulse", value: 95, complication: "Pulse <100 or > 160 bpm" },
        { concept: "Child Pulse", value: 165, complication: "Pulse <100 or > 160 bpm" },
        { concept: "Child Temperature", value: 97.4, complication: "Low Temperature" },
        { concept: "Child Temperature", value: 99.7, complication: "High Temperature" },
        { concept: "Child Respiratory Rate", value: 29, complication: "Respiratory Rate <30 or > 60 bpm" },
        { concept: "Child Respiratory Rate", value: 62, complication: "Respiratory Rate <30 or > 60 bpm" },
        { concept: "Birth Weight", value: 1.2, complication: "Child born Underweight" }
        ].forEach((referral) => {

            it(`is adviced if '${referral.concept}' is '${referral.value}'`, () => {
                let childDeliveryEncounter = protoChildDeliveryEncounter.forConcept(referral.concept, referral.value).build();
                decisions = motherEncounterDecision.getDecisions(childDeliveryEncounter, new Date());
                assert.include(C.findValue(decisions.encounterDecisions, 'Refer to the hospital immediately for'), referral.complication,
                    `expected to be referred to the hospital immediately for '${referral.complication}'`);
            });


        });
    });

    describe("Referring to the hospital", () => {
        [{ concept: "Breast feeding within 1 hour of birth", value: "No", complication: "Not Breast-fed within 1 hour of birth" }
        ].forEach((referral) => {

            it(`is adviced if '${referral.concept}' is '${referral.value}'`, () => {
                let childDeliveryEncounter = protoChildDeliveryEncounter.forSingleCoded(referral.concept, referral.value).build();
                decisions = motherEncounterDecision.getDecisions(childDeliveryEncounter, new Date());
                assert.include(C.findValue(decisions.encounterDecisions, 'Refer to the hospital for'), referral.complication,
                    `expected to be referred to the hospital for '${referral.complication}'`);
            });

        });

    });

});

