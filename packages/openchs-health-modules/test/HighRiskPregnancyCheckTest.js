import TestHelper from "./TestHelper";

const expect = require('chai').expect;
const moment = require('moment');
const assert = require('chai').assert;
const _ = require('lodash');
const motherEncounterDecision = require('../health_modules/mother/motherProgramEncounterDecision');
const motherEnrolmentDecision = require('../health_modules/mother/motherProgramEnrolmentDecision');
const ProgramEncounter = require("./Entities").ProgramEncounter;
const ProgramEnrolment = require("./Entities").ProgramEnrolment;
const C = require('../health_modules/common');
const concepts = require('./Concepts');

describe('High Risk Pregnancy Determination', () => {
    let enrolment, programEncounter, referenceDate, systolicConcept, diastolicConcept, hb, age, dob, hiv, vdrl, height,
        weight, sicklingTest, hbE, hbsAg, obstetricsHistory, paracheck, urineAlbumin;

    beforeEach(() => {
        referenceDate = new Date(2017, 6, 6);
        dob = new Date(1990, 6, 6);
        age = moment(referenceDate).diff(dob, 'years');
        programEncounter = new ProgramEncounter("ANC", referenceDate);
        enrolment = new ProgramEnrolment('Mother', [programEncounter], dob);
        programEncounter.programEnrolment = enrolment;
        systolicConcept = concepts['Systolic'];
        diastolicConcept = concepts['Diastolic'];
        hb = concepts['Hb'];
        hiv = concepts['HIV/AIDS Test'];
        vdrl = concepts['VDRL'];
        height = concepts["Height"];
        urineAlbumin = concepts['Urine Albumin'];
        weight = concepts["Weight"];
        sicklingTest = concepts["Sickling Test"];
        hbE = concepts["Hb Electrophoresis"];
        hbsAg = concepts["HbsAg"];
        paracheck = concepts["Paracheck"];
        obstetricsHistory = concepts["Obstetrics history"];
        enrolment.setObservation('Last menstrual period', moment(referenceDate).subtract(20, "weeks").toDate());
    });

    it("is run fresh every time ", () => {
        enrolment.setObservation('Last menstrual period', moment(referenceDate).subtract(20, "weeks").toDate());
        programEncounter.setObservation("High Risk Conditions", ["Dummy high risk condition"]);
        let decisions = motherEncounterDecision.getDecisions(programEncounter, referenceDate).encounterDecisions;

        let complications = TestHelper.findCodedValue(decisions, "High Risk Conditions");
        expect(complications).to.be.an('array').that.is.empty;

        programEncounter.setObservation(systolicConcept.name, systolicConcept.highNormal + 1)
            .setObservation(diastolicConcept.name, diastolicConcept.highNormal + 1);

        decisions = motherEncounterDecision.getDecisions(programEncounter, referenceDate).encounterDecisions;
        complications = TestHelper.findCodedValue(decisions, "High Risk Conditions");
        expect(complications).to.exist;
        expect(complications).to.be.an('array').to.have.lengthOf(1).that.includes('Essential Hypertension');
    });

    describe("Less than 20 weeks of pregnancy", () => {

        beforeEach(() => {
            enrolment.setObservation('Last menstrual period', moment(referenceDate).subtract(20, "weeks").toDate());
        });

        describe("Ante Partum hemorrhage (APH)", () => {
            it("Shouldn't mark high risk if Pregnancy complaints are undefined", () => {
                enrolment.setObservation("Pregnancy complications", undefined);
                const decisions = motherEncounterDecision.getDecisions(programEncounter, referenceDate).encounterDecisions;
                const complications = TestHelper.findCodedValue(decisions, "High Risk Conditions");
                expect(complications).to.be.an('array').that.is.empty;;
            });

            it("Shouldn't mark high risk if Pregnancy complaints are empty", () => {
                enrolment.setObservation("Pregnancy complications", []);
                const decisions = motherEncounterDecision.getDecisions(programEncounter, referenceDate).encounterDecisions;
                const complications = TestHelper.findCodedValue(decisions, "High Risk Conditions");
                expect(complications).to.be.an('array').that.is.empty;;
            });

            it("Shouldn't mark high risk if vaginal bleeding is present", () => {
                enrolment.setObservation("Pregnancy complications", ["Per vaginal bleeding"]);
                const decisions = motherEncounterDecision.getDecisions(programEncounter, referenceDate).encounterDecisions;
                const complications = TestHelper.findCodedValue(decisions, "High Risk Conditions");
                expect(complications).to.exist;
                expect(complications).to.be.an('array').that.includes('Miscarriage');
            });

        });

        describe('Essential Hypertension', () => {

            it("Should not mark Essential Hypertension as if BP is normal", () => {
                programEncounter.setObservation(systolicConcept.name, systolicConcept.highNormal - 1)
                    .setObservation(diastolicConcept.name, diastolicConcept.highNormal - 1);
                const decisions = motherEncounterDecision.getDecisions(programEncounter, referenceDate).encounterDecisions;
                const complications = TestHelper.findCodedValue(decisions, "High Risk Conditions");
                expect(complications).to.be.an('array').that.is.empty;
            });


            it("Should mark Essential Hypertension as High Risk If Systolic is abnormal high", () => {
                programEncounter.setObservation(systolicConcept.name, systolicConcept.highNormal + 1)
                    .setObservation(diastolicConcept.name, diastolicConcept.highNormal - 1);
                const decisions = motherEncounterDecision.getDecisions(programEncounter, referenceDate).encounterDecisions;
                const complications = TestHelper.findCodedValue(decisions, "High Risk Conditions");
                expect(complications).to.exist;
                expect(complications).to.be.an('array').that.includes('Essential Hypertension');
            });

            it("Should mark Essential Hypertension as High Risk If Diastolic is abnormal high", () => {
                programEncounter.setObservation(systolicConcept.name, systolicConcept.highNormal - 1)
                    .setObservation(diastolicConcept.name, diastolicConcept.highNormal + 1);
                const decisions = motherEncounterDecision.getDecisions(programEncounter, referenceDate).encounterDecisions;
                const complications = TestHelper.findCodedValue(decisions, "High Risk Conditions");
                expect(complications).to.exist;
                expect(complications).to.be.an('array').that.includes('Essential Hypertension');
            });

            it("Should mark Essential Hypertension as High Risk If Diastolic and Systolic is abnormal high", () => {
                programEncounter.setObservation(systolicConcept.name, systolicConcept.highNormal + 1)
                    .setObservation(diastolicConcept.name, diastolicConcept.highNormal + 1);
                const decisions = motherEncounterDecision.getDecisions(programEncounter, referenceDate).encounterDecisions;
                const complications = TestHelper.findCodedValue(decisions, "High Risk Conditions");
                expect(complications).to.exist;
                expect(complications).to.be.an('array').that.includes('Essential Hypertension');
            });
        });

        describe("Superimposed Pre-Eclampsia", () => {

            describe('Absence of Urine Albumin', () => {
                beforeEach(() => {
                    programEncounter.setObservation(systolicConcept.name, systolicConcept.highNormal - 1)
                        .setObservation(diastolicConcept.name, diastolicConcept.highNormal - 1)
                        .setObservation(urineAlbumin.name, "Absent");

                });

                it('Should not mark superimposed pre-eclampsia and Hypertension with Absent Urine Albumin and normal BP', () => {
                    const decisions = motherEncounterDecision.getDecisions(programEncounter, referenceDate).encounterDecisions;
                    const complications = TestHelper.findCodedValue(decisions, "High Risk Conditions");
                    expect(complications).to.be.an('array').that.is.empty;
                });

                it('Should not mark superimposed pre-eclampsia and Hypertension with Absent Urine Albumin', () => {
                    programEncounter.setObservation(diastolicConcept.name, diastolicConcept.highNormal + 1);
                    const decisions = motherEncounterDecision.getDecisions(programEncounter, referenceDate).encounterDecisions;
                    const complications = TestHelper.findCodedValue(decisions, "High Risk Conditions");
                    expect(complications).to.exist;
                    expect(complications).to.be.an('array').that.includes('Essential Hypertension');
                    expect(complications).to.be.an('array').to.not.include('Superimposed Pre-Eclampsia');
                });

            });

            describe('Presence of Urine Albumin', () => {
                beforeEach(() => {
                    programEncounter.setObservation(systolicConcept.name, systolicConcept.highNormal - 1)
                        .setObservation(diastolicConcept.name, diastolicConcept.highNormal + 1);

                });

                afterEach(() => {
                    const decisions = motherEncounterDecision.getDecisions(programEncounter, referenceDate).encounterDecisions;
                    const complications = TestHelper.findCodedValue(decisions, "High Risk Conditions");
                    expect(complications).to.exist;
                    expect(complications).to.be.an('array').that.includes('Essential Hypertension');
                    expect(complications).to.be.an('array').that.includes('Superimposed Pre-Eclampsia');
                });

                it('Should mark superimposed pre-eclampsia with Trace Urine Albumin ', () => {
                    programEncounter.setObservation("Urine Albumin", 'Trace');
                });

                it('Should mark superimposed pre-eclampsia with +1 Urine Albumin ', () => {
                    programEncounter.setObservation("Urine Albumin", '+1');
                });

                it('Should mark superimposed pre-eclampsia with +2 Urine Albumin ', () => {
                    programEncounter.setObservation("Urine Albumin", '+2');
                });

                it('Should mark superimposed pre-eclampsia with +3 Urine Albumin ', () => {
                    programEncounter.setObservation("Urine Albumin", '+3');
                });

                it('Should mark superimposed pre-eclampsia with +4 Urine Albumin ', () => {
                    programEncounter.setObservation("Urine Albumin", '+4');
                });

            });
        });

    });

    describe("More than 20 weeks of pregnancy", () => {
        let lmp;
        beforeEach(() => {
            lmp = new Date(2017, 1, 10);
            enrolment.setObservation('Last menstrual period', lmp);
        });

        describe("Ante Partum hemorrhage (APH)", () => {

            it("Shouldn't mark high risk if Pregnancy complaints are undefined", () => {
                programEncounter.setObservation("Pregnancy complications", undefined);
                const decisions = motherEncounterDecision.getDecisions(programEncounter, referenceDate).encounterDecisions;
                const complications = TestHelper.findCodedValue(decisions, "High Risk Conditions");
                expect(complications).to.be.an('array').that.is.empty;
            });

            it("Shouldn't mark high risk if Pregnancy complaints are empty", () => {
                programEncounter.setObservation("Pregnancy complications", []);
                const decisions = motherEncounterDecision.getDecisions(programEncounter, referenceDate).encounterDecisions;
                const complications = TestHelper.findCodedValue(decisions, "High Risk Conditions");
                expect(complications).to.be.an('array').that.is.empty;
            });

            it("Should mark high risk if vaginal bleeding is present", () => {
                programEncounter.setObservation("Pregnancy complications", ["Per vaginal bleeding"]);
                const decisions = motherEncounterDecision.getDecisions(programEncounter, referenceDate).encounterDecisions;
                const complications = TestHelper.findCodedValue(decisions, "High Risk Conditions");
                expect(complications).to.exist;
                expect(complications).to.be.an('array').that.includes('Ante Partum hemorrhage (APH)');
            });

        });

        describe("Pregnancy Induced Hypertension", () => {
            it("Should not mark high risk for normal BP", () => {
                programEncounter.setObservation(systolicConcept.name, systolicConcept.highNormal - 1)
                    .setObservation(diastolicConcept.name, diastolicConcept.highNormal - 1);
                const decisions = motherEncounterDecision.getDecisions(programEncounter, referenceDate).encounterDecisions;
                const complications = TestHelper.findCodedValue(decisions, "High Risk Conditions");
                expect(complications).to.be.an('array').that.is.empty;
            });

            describe("Normal BP during the first 20 weeks", () => {
                beforeEach(() => {
                    enrolment.setObservation('High Risk Conditions', []);
                });

                it("Should mark high risk for high Systolic BP given normal BP before 20 Weeks", () => {
                    programEncounter.setObservation(systolicConcept.name, systolicConcept.highNormal + 1)
                        .setObservation(diastolicConcept.name, diastolicConcept.highNormal - 1);
                    const decisions = motherEncounterDecision.getDecisions(programEncounter, referenceDate).encounterDecisions;
                    const complications = TestHelper.findCodedValue(decisions, "High Risk Conditions");
                    expect(complications).to.exist;
                    expect(complications).to.be.an('array').that.includes('Pregnancy induced hypertension');
                });

                it("Should mark high risk for high Diastolic BP given normal BP before 20 Weeks", () => {
                    programEncounter.setObservation(systolicConcept.name, systolicConcept.highNormal - 1)
                        .setObservation(diastolicConcept.name, diastolicConcept.highNormal + 1);
                    const decisions = motherEncounterDecision.getDecisions(programEncounter, referenceDate).encounterDecisions;
                    const complications = TestHelper.findCodedValue(decisions, "High Risk Conditions");
                    expect(complications).to.exist;
                    expect(complications).to.be.an('array').that.includes('Pregnancy induced hypertension');
                });

                it("Should mark high risk for high Diastolic and Diastolic BP given normal before 20 Weeks", () => {
                    programEncounter.setObservation(systolicConcept.name, systolicConcept.highNormal + 1)
                        .setObservation(diastolicConcept.name, diastolicConcept.highNormal + 1);
                    const decisions = motherEncounterDecision.getDecisions(programEncounter, referenceDate).encounterDecisions;
                    const complications = TestHelper.findCodedValue(decisions, "High Risk Conditions");
                    expect(complications).to.exist;
                    expect(complications).to.be.an('array').that.includes('Pregnancy induced hypertension');
                });
            });


            describe("High BP during the first 20 weeks", () => {
                beforeEach(() => {
                    enrolment.setObservation('High Risk Conditions', ["Essential Hypertension"]);
                });

                it("Should mark high risk for high Systolic BP given normal before 20 Weeks", () => {
                    programEncounter.setObservation(systolicConcept.name, systolicConcept.highNormal + 1)
                        .setObservation(diastolicConcept.name, diastolicConcept.highNormal - 1);
                    const decisions = motherEncounterDecision.getDecisions(programEncounter, referenceDate).encounterDecisions;
                    const complications = TestHelper.findCodedValue(decisions, "High Risk Conditions");
                    expect(complications).to.be.an('array').that.is.empty;
                });

                it("Should mark high risk for high Diastolic BP given normal before 20 Weeks", () => {
                    programEncounter.setObservation(systolicConcept.name, systolicConcept.highNormal - 1)
                        .setObservation(diastolicConcept.name, diastolicConcept.highNormal + 1);
                    const decisions = motherEncounterDecision.getDecisions(programEncounter, referenceDate).encounterDecisions;
                    const complications = TestHelper.findCodedValue(decisions, "High Risk Conditions");
                    expect(complications).to.be.an('array').that.is.empty;
                });

                it("Should mark high risk for high Diastolic and Diastolic BP given normal before 20 Weeks", () => {
                    programEncounter.setObservation(systolicConcept.name, systolicConcept.highNormal + 1)
                        .setObservation(diastolicConcept.name, diastolicConcept.highNormal + 1);
                    const decisions = motherEncounterDecision.getDecisions(programEncounter, referenceDate).encounterDecisions;
                    const complications = TestHelper.findCodedValue(decisions, "High Risk Conditions");
                    expect(complications).to.be.an('array').that.is.empty;
                });
            });

            describe("Eclampsia", () => {
                beforeEach(() => {
                    enrolment.setObservation('High Risk Conditions', []);
                });

                it("Should not mark Eclampsia for hyper tension, convulsions and Absent Urine Albumin", () => {
                    programEncounter.setObservation(systolicConcept.name, systolicConcept.highNormal + 1)
                        .setObservation(diastolicConcept.name, diastolicConcept.highNormal - 1)
                        .setObservation("Convulsions", "Present")
                        .setObservation(urineAlbumin.name, 'Absent');
                    const decisions = motherEncounterDecision.getDecisions(programEncounter, referenceDate).encounterDecisions;
                    const complications = TestHelper.findCodedValue(decisions, "High Risk Conditions");
                    expect(complications).to.be.an('array').that.not.includes('Eclampsia');

                });

                it("Should not mark Eclampsia for hyper tension, convulsions and Trace Urine Albumin", () => {
                    programEncounter.setObservation(systolicConcept.name, systolicConcept.highNormal + 1)
                        .setObservation(diastolicConcept.name, diastolicConcept.highNormal - 1)
                        .setObservation("Has she been having convulsions?", "Present")
                        .setObservation(urineAlbumin.name, 'Trace');
                    const decisions = motherEncounterDecision.getDecisions(programEncounter, referenceDate).encounterDecisions;
                    const complications = TestHelper.findCodedValue(decisions, "High Risk Conditions");
                    expect(complications).to.be.an('array').that.includes('Eclampsia');
                });

                it("Should mark Eclampsia for hyper tension, convulsions and +1 Urine Albumin", () => {
                    programEncounter.setObservation(systolicConcept.name, systolicConcept.highNormal + 1)
                        .setObservation(diastolicConcept.name, diastolicConcept.highNormal - 1)
                        .setObservation("Has she been having convulsions?", "Present")
                        .setObservation(urineAlbumin.name, '+1');
                    const decisions = motherEncounterDecision.getDecisions(programEncounter, referenceDate).encounterDecisions;
                    const complications = TestHelper.findCodedValue(decisions, "High Risk Conditions");
                    expect(complications).to.be.an('array').that.includes('Eclampsia');
                });

                it("Should mark Eclampsia for hyper tension, convulsions and +2 Urine Albumin", () => {
                    programEncounter.setObservation(systolicConcept.name, systolicConcept.highNormal + 1)
                        .setObservation(diastolicConcept.name, diastolicConcept.highNormal - 1)
                        .setObservation("Has she been having convulsions?", "Present")
                        .setObservation(urineAlbumin.name, '+2');
                    const decisions = motherEncounterDecision.getDecisions(programEncounter, referenceDate).encounterDecisions;
                    const complications = TestHelper.findCodedValue(decisions, "High Risk Conditions");
                    expect(complications).to.be.an('array').that.includes('Eclampsia');
                });

                it("Should mark Eclampsia for hyper tension, convulsions and +3 Urine Albumin", () => {
                    programEncounter.setObservation(systolicConcept.name, systolicConcept.highNormal + 1)
                        .setObservation(diastolicConcept.name, diastolicConcept.highNormal - 1)
                        .setObservation("Has she been having convulsions?", "Present")
                        .setObservation(urineAlbumin.name, '+3');
                    const decisions = motherEncounterDecision.getDecisions(programEncounter, referenceDate).encounterDecisions;
                    const complications = TestHelper.findCodedValue(decisions, "High Risk Conditions");
                    expect(complications).to.be.an('array').that.includes('Eclampsia');
                });

                it("Should mark Eclampsia for hyper tension, convulsions and +4 Urine Albumin", () => {
                    programEncounter.setObservation(systolicConcept.name, systolicConcept.highNormal + 1)
                        .setObservation(diastolicConcept.name, diastolicConcept.highNormal - 1)
                        .setObservation("Has she been having convulsions?", "Present")
                        .setObservation(urineAlbumin.name, '+4');
                    const decisions = motherEncounterDecision.getDecisions(programEncounter, referenceDate).encounterDecisions;
                    const complications = TestHelper.findCodedValue(decisions, "High Risk Conditions");
                    expect(complications).to.be.an('array').that.includes('Eclampsia');
                });

                it("Should mark Mild Pre-Eclampsia for hyper tension and Trace Urine Albumin", () => {
                    programEncounter.setObservation(systolicConcept.name, systolicConcept.highNormal + 1)
                        .setObservation(diastolicConcept.name, diastolicConcept.highNormal - 1)
                        .setObservation("Has she been having convulsions?", "Absent")
                        .setObservation(urineAlbumin.name, 'Trace');
                    const decisions = motherEncounterDecision.getDecisions(programEncounter, referenceDate).encounterDecisions;
                    const complications = TestHelper.findCodedValue(decisions, "High Risk Conditions");
                    expect(complications).to.be.an('array').that.includes('Mild Pre-Eclampsia');
                });

                it("Should mark Mild Pre-Eclampsia for hyper tension and +1 Urine Albumin", () => {
                    programEncounter.setObservation(systolicConcept.name, systolicConcept.highNormal + 1)
                        .setObservation(diastolicConcept.name, diastolicConcept.highNormal - 1)
                        .setObservation("Has she been having convulsions?", "Absent")
                        .setObservation(urineAlbumin.name, '+1');
                    const decisions = motherEncounterDecision.getDecisions(programEncounter, referenceDate).encounterDecisions;
                    const complications = TestHelper.findCodedValue(decisions, "High Risk Conditions");
                    expect(complications).to.be.an('array').that.includes('Mild Pre-Eclampsia');
                });

                it("Should mark Mild Pre-Eclampsia for hyper tension and +2 Urine Albumin", () => {
                    programEncounter.setObservation(systolicConcept.name, systolicConcept.highNormal + 1)
                        .setObservation(diastolicConcept.name, diastolicConcept.highNormal - 1)
                        .setObservation("Has she been having convulsions?", "Absent")
                        .setObservation(urineAlbumin.name, '+2');
                    const decisions = motherEncounterDecision.getDecisions(programEncounter, referenceDate).encounterDecisions;
                    const complications = TestHelper.findCodedValue(decisions, "High Risk Conditions");
                    expect(complications).to.be.an('array').that.includes('Mild Pre-Eclampsia');
                });

                it("Should mark Mild Pre-Eclampsia for hyper tension and +3 Urine Albumin", () => {
                    programEncounter.setObservation(systolicConcept.name, systolicConcept.highNormal + 1)
                        .setObservation(diastolicConcept.name, diastolicConcept.highNormal - 1)
                        .setObservation("Has she been having convulsions?", "Absent")
                        .setObservation(urineAlbumin.name, '+3');
                    const decisions = motherEncounterDecision.getDecisions(programEncounter, referenceDate).encounterDecisions;
                    const complications = TestHelper.findCodedValue(decisions, "High Risk Conditions");
                    expect(complications).to.be.an('array').that.includes('Severe Pre-Eclampsia');
                });

                it("Should mark Mild Pre-Eclampsia for hyper tension and +3 Urine Albumin", () => {
                    programEncounter.setObservation(systolicConcept.name, systolicConcept.highNormal + 1)
                        .setObservation(diastolicConcept.name, diastolicConcept.highNormal - 1)
                        .setObservation("Has she been having convulsions?", "Absent")
                        .setObservation(urineAlbumin.name, '+4');
                    const decisions = motherEncounterDecision.getDecisions(programEncounter, referenceDate).encounterDecisions;
                    const complications = TestHelper.findCodedValue(decisions, "High Risk Conditions");
                    expect(complications).to.be.an('array').that.includes('Severe Pre-Eclampsia');
                });
            });

        });
    });


    describe("Anemia", () => {
        it("Shouldn't have Anemia if hb is normal", () => {
            programEncounter.setObservation(hb.name, 12);
            const decisions = motherEncounterDecision.getDecisions(programEncounter, referenceDate).encounterDecisions;
            const complicationValues = TestHelper.findCodedValue(decisions, "High Risk Conditions");
            expect(complicationValues).to.be.an('array').that.is.empty;
        });

        it("Should have Moderate Anemia if hb is moderately below normal (between 7 and 11)", () => {
            programEncounter.setObservation(hb.name, 7.1);
            const decisions = motherEncounterDecision.getDecisions(programEncounter, referenceDate).encounterDecisions;
            const complicationValues = TestHelper.findCodedValue(decisions, "High Risk Conditions");
            expect(complicationValues).to.exist;
            expect(complicationValues).to.be.an('array').that.includes('Moderate Anemia');
        });

        it("Should have Severe Anemia if hb is severely below normal", () => {
            programEncounter.setObservation(hb.name, 6.9);
            const decisions = motherEncounterDecision.getDecisions(programEncounter, referenceDate).encounterDecisions;
            const complicationValues = TestHelper.findCodedValue(decisions, "High Risk Conditions");
            expect(complicationValues).to.exist;
            expect(complicationValues).to.be.an('array').that.includes('Severe Anemia');
        });

    });

    describe("HIV/AIDS", () => {
        it("Shouldn't mark high risk if HIV/AIDS negative", () => {
            programEncounter.setObservation(hiv.name, 'Negative');
            const decisions = motherEncounterDecision.getDecisions(programEncounter, referenceDate).encounterDecisions;
            const complicationValues = TestHelper.findCodedValue(decisions, "High Risk Conditions");
            expect(complicationValues).to.be.an('array').that.is.empty;
        });

        it("Should mark high risk if HIV/AIDS Postive", () => {
            programEncounter.setObservation(hiv.name, 'Positive');
            const decisions = motherEncounterDecision.getDecisions(programEncounter, referenceDate).encounterDecisions;
            const complicationValues = TestHelper.findCodedValue(decisions, "High Risk Conditions");
            expect(complicationValues).to.exist;
            expect(complicationValues).to.be.an('array').that.includes('HIV/AIDS Positive');
        });
    });


    describe("VDRL", () => {
        it("Shouldn't mark high risk if VDRL negative", () => {
            programEncounter.setObservation(vdrl.name, 'Negative');
            const decisions = motherEncounterDecision.getDecisions(programEncounter, referenceDate).encounterDecisions;
            const complicationValues = TestHelper.findCodedValue(decisions, "High Risk Conditions");
            expect(complicationValues).to.be.an('array').that.is.empty;
        });

        it("Should mark high risk if VDRL Postive", () => {
            programEncounter.setObservation(vdrl.name, 'Positive');
            const decisions = motherEncounterDecision.getDecisions(programEncounter, referenceDate).encounterDecisions;
            const complicationValues = TestHelper.findCodedValue(decisions, "High Risk Conditions");
            expect(complicationValues).to.exist;
            expect(complicationValues).to.be.an('array').that.includes('VDRL Positive');
        });
    });

    describe("Short Stature", () => {
        it("Shouldn't mark high risk if height is not specified", () => {
            const decisions = motherEnrolmentDecision.getDecisions(enrolment, referenceDate).enrolmentDecisions;
            const complicationValues = TestHelper.findCodedValue(decisions, "High Risk Conditions");
            expect(complicationValues).to.be.empty;
        });

        it("Shouldn't mark high risk if height is above 145cms", () => {
            enrolment.setObservation(height.name, 151);
            const decisions = motherEnrolmentDecision.getDecisions(enrolment, referenceDate).enrolmentDecisions;
            const complicationValues = TestHelper.findCodedValue(decisions, "High Risk Conditions");
            expect(complicationValues).to.be.empty;
        });

        it("Should mark high risk if height is equal to 145cms", () => {
            enrolment.setObservation(height.name, 145);
            const decisions = motherEnrolmentDecision.getDecisions(enrolment, referenceDate).enrolmentDecisions;
            const complicationValues = TestHelper.findCodedValue(decisions, "High Risk Conditions");
            expect(complicationValues).to.exist;
            expect(complicationValues).to.be.an('array').that.includes('Short Stature');
        });

        it("Should mark high risk if height is less than 145cms", () => {
            enrolment.setObservation(height.name, 100);
            const decisions = motherEnrolmentDecision.getDecisions(enrolment, referenceDate).enrolmentDecisions;
            const complicationValues = TestHelper.findCodedValue(decisions, "High Risk Conditions");
            expect(complicationValues).to.exist;
            expect(complicationValues).to.be.an('array').that.includes('Short Stature');
        });
    });

    describe("Weight Issues", () => {
        it("Shouldn't mark high risk if weight is not specified", () => {
            const decisions = motherEncounterDecision.getDecisions(programEncounter, referenceDate).encounterDecisions;
            const complicationValues = TestHelper.findCodedValue(decisions, "High Risk Conditions");
            expect(complicationValues).to.be.an('array').that.is.empty;
        });

        it("Shouldn't mark high risk if weight is above 35Kgs", () => {
            programEncounter.setObservation(weight.name, 36);
            const decisions = motherEncounterDecision.getDecisions(programEncounter, referenceDate).encounterDecisions;
            const complicationValues = TestHelper.findCodedValue(decisions, "High Risk Conditions");
            expect(complicationValues).to.be.an('array').that.is.empty;
        });

        it("Should mark high risk if weight is equal to 35Kgs", () => {
            programEncounter.setObservation(weight.name, 35);
            const decisions = motherEncounterDecision.getDecisions(programEncounter, referenceDate).encounterDecisions;
            const complicationValues = TestHelper.findCodedValue(decisions, "High Risk Conditions");
            expect(complicationValues).to.exist;
            expect(complicationValues).to.be.an('array').that.includes('Underweight');
        });

        it("Should mark high risk if weight is less than 35Kgs", () => {
            programEncounter.setObservation(weight.name, 31);
            const decisions = motherEncounterDecision.getDecisions(programEncounter, referenceDate).encounterDecisions;
            const complicationValues = TestHelper.findCodedValue(decisions, "High Risk Conditions");
            expect(complicationValues).to.exist;
            expect(complicationValues).to.be.an('array').that.includes('Underweight');
        });
    });

    describe("Under/Old Age Pregnancy", () => {
        let context;
        const setDOBTo = (age) => {
            referenceDate = new Date(2017, 6, 6);
            dob = moment(referenceDate).subtract(age, 'years').toDate();
            programEncounter = new ProgramEncounter("ANC", referenceDate);
            enrolment = new ProgramEnrolment('Mother', [programEncounter], dob);
            enrolment.enrolmentDateTime = referenceDate;
            programEncounter.programEnrolment = enrolment;
            enrolment.setObservation('Last menstrual period', moment(referenceDate).subtract(20, "weeks").toDate());
            context = {usage: 'NonExit', programEnrolment: enrolment};
        };

        it("Shouldn't mark high risk if age is 18", () => {
            setDOBTo(18);
            const decisions = motherEnrolmentDecision.getDecisions(enrolment, referenceDate).enrolmentDecisions;
            const complicationValues = TestHelper.findCodedValue(decisions, "High Risk Conditions");
            expect(complicationValues).to.be.empty;
        });

        /*
        it("Shouldn't mark high risk if age is equal to 30", () => {
            setDOBTo(30);
            const decisions = motherEnrolmentDecision.getDecisions(enrolment, context, referenceDate).enrolmentDecisions;
            const complicationValues = TestHelper.findCodedValue(decisions, "High Risk Conditions");
            expect(complicationValues).to.be.empty;
        });
        */

        it("Should mark high risk if age is less than 18", () => {
            setDOBTo(15);
            const decisions = motherEnrolmentDecision.getDecisions(enrolment, referenceDate).enrolmentDecisions;
            const complicationValues = TestHelper.findCodedValue(decisions, "High Risk Conditions");
            expect(complicationValues).to.exist;
            expect(complicationValues).to.be.an('array').that.includes('Under age pregnancy');
        });

        it("Should mark high risk if age is more than 30", () => {
            setDOBTo(32);
            const decisions = motherEnrolmentDecision.getDecisions(enrolment, referenceDate).enrolmentDecisions;
            const complicationValues = TestHelper.findCodedValue(decisions, "High Risk Conditions");
            expect(complicationValues).to.exist;
            expect(complicationValues).to.be.an('array').that.includes('Old age pregnancy');
        });
    });

    describe("Sickling Positive", () => {
        it("Shouldn't mark high risk if Sickling test negative", () => {
            enrolment.setObservation(sicklingTest.name, 'Negative');
            const decisions = motherEncounterDecision.getDecisions(programEncounter, referenceDate).encounterDecisions;
            const complicationValues = TestHelper.findCodedValue(decisions, "High Risk Conditions");
            expect(complicationValues).to.be.an('array').that.is.empty;
        });

        it("Should mark high risk if Sickling Test Positive", () => {
            enrolment.setObservation(sicklingTest.name, 'Positive');
            const decisions = motherEncounterDecision.getDecisions(programEncounter, referenceDate).encounterDecisions;
            const complicationValues = TestHelper.findCodedValue(decisions, "High Risk Conditions");
            expect(complicationValues).to.exist;
            expect(complicationValues).to.be.an('array').that.includes('Sickling Positive');
        });
    });

    describe("Sickle cell disease", () => {
        it("Shouldn't mark high risk if Hb Electrophoresis AA", () => {
            programEncounter.setObservation(hbE.name, 'AA');
            const decisions = motherEncounterDecision.getDecisions(programEncounter, referenceDate).encounterDecisions;
            const complicationValues = TestHelper.findCodedValue(decisions, "High Risk Conditions");
            expect(complicationValues).to.be.an('array').that.is.empty;
        });

        it("Shouldn't mark high risk if Hb Electrophoresis AS", () => {
            programEncounter.setObservation(hbE.name, 'AS');
            const decisions = motherEncounterDecision.getDecisions(programEncounter, referenceDate).encounterDecisions;
            const complicationValues = TestHelper.findCodedValue(decisions, "High Risk Conditions");
            expect(complicationValues).to.be.an('array').that.is.empty;
        });

        it("Should mark high risk if Hb Electrophoresis SS", () => {
            programEncounter.setObservation(hbE.name, 'SS');
            const decisions = motherEncounterDecision.getDecisions(programEncounter, referenceDate).encounterDecisions;
            const complicationValues = TestHelper.findCodedValue(decisions, "High Risk Conditions");
            expect(complicationValues).to.exist;
            expect(complicationValues).to.be.an('array').that.includes('Sickle cell disease SS');
        });
    });


    describe("Hepatitis B", () => {
        it("Shouldn't mark high risk if HbsAg Negative", () => {
            programEncounter.setObservation(hbsAg.name, 'Negative');
            const decisions = motherEncounterDecision.getDecisions(programEncounter, referenceDate).encounterDecisions;
            const complicationValues = TestHelper.findCodedValue(decisions, "High Risk Conditions");
            expect(complicationValues).to.be.an('array').that.is.empty;
        });

        it("Should mark high risk if HbsAg Positive", () => {
            programEncounter.setObservation(hbsAg.name, 'Positive');
            const decisions = motherEncounterDecision.getDecisions(programEncounter, referenceDate).encounterDecisions;
            const complicationValues = TestHelper.findCodedValue(decisions, "High Risk Conditions");
            expect(complicationValues).to.exist;
            expect(complicationValues).to.be.an('array').that.includes('Hepatitis B Positive');
        });
    });

    describe("Obstetrics History", () => {
        it("Should mark high risk if Intrauterine Growth Retardation in Obstetrics History", () => {
            enrolment.setObservation(obstetricsHistory.name, ['Intrauterine Growth Retardation']);
            const decisions = motherEnrolmentDecision.getDecisions(enrolment, referenceDate).enrolmentDecisions;
            const complicationValues = TestHelper.findCodedValue(decisions, "High Risk Conditions");
            expect(complicationValues).to.exist;
            expect(complicationValues).to.be.an('array').that.includes('Previous Intrauterine Growth Retardation');
        });

        it("Should mark high risk if Previous Still Birth in Obstetrics History", () => {
            enrolment.setObservation(obstetricsHistory.name, ['Still Birth']);
            const decisions = motherEnrolmentDecision.getDecisions(enrolment, referenceDate).enrolmentDecisions;
            const complicationValues = TestHelper.findCodedValue(decisions, "High Risk Conditions");
            expect(complicationValues).to.exist;
            expect(complicationValues).to.be.an('array').that.includes('Previous Still Birth');
        });

        it("Should mark high risk if Intrauterine death in Obstetrics History", () => {
            enrolment.setObservation(obstetricsHistory.name, ['Intrauterine death']);
            const decisions = motherEnrolmentDecision.getDecisions(enrolment, referenceDate).enrolmentDecisions;
            const complicationValues = TestHelper.findCodedValue(decisions, "High Risk Conditions");
            expect(complicationValues).to.exist;
            expect(complicationValues).to.be.an('array').that.includes('Previous Intrauterine Death');
        });

        it("Should mark high risk if Retained Placenta in Obstetrics History", () => {
            enrolment.setObservation(obstetricsHistory.name, ['Retained Placenta']);
            const decisions = motherEnrolmentDecision.getDecisions(enrolment, referenceDate).enrolmentDecisions;
            const complicationValues = TestHelper.findCodedValue(decisions, "High Risk Conditions");
            expect(complicationValues).to.exist;
            expect(complicationValues).to.be.an('array').that.includes('Previous Retained Placenta');
        });

        it("Should mark high risk if 3 or more than 3 spontaneous abortions in Obstetrics History", () => {
            enrolment.setObservation(obstetricsHistory.name, ['3 or more than 3 spontaneous abortions']);
            const decisions = motherEnrolmentDecision.getDecisions(enrolment, referenceDate).enrolmentDecisions;
            const complicationValues = TestHelper.findCodedValue(decisions, "High Risk Conditions");
            expect(complicationValues).to.exist;
            expect(complicationValues).to.be.an('array').that.includes('Previous Abortion(s)');
        });

        it("Should mark high risk if Gravida is more than 5", () => {
            enrolment.setObservation("Gravida", 5);
            const decisions = motherEnrolmentDecision.getDecisions(enrolment, referenceDate).enrolmentDecisions;
            const complicationValues = TestHelper.findCodedValue(decisions, "High Risk Conditions");
            expect(complicationValues).to.exist;
            expect(complicationValues).to.be.an('array').that.includes('Grand Multipara');
        });
    });

    describe('Malaria', () => {
        it("Shouldn't mark high risk if Paracheck negative", () => {
            programEncounter.setObservation(paracheck.name, 'Negative');
            const decisions = motherEncounterDecision.getDecisions(programEncounter, referenceDate).encounterDecisions;
            const complications = TestHelper.findCodedValue(decisions, "High Risk Conditions");
            expect(complications).to.be.an('array').that.is.empty;
        });

        it('Should mark high risk and malaria positive if Paracheck PV', () => {
            programEncounter.setObservation(paracheck.name, 'Positive for PV');
            const decisions = motherEncounterDecision.getDecisions(programEncounter, referenceDate).encounterDecisions;
            const complications = TestHelper.findCodedValue(decisions, "High Risk Conditions");
            expect(complications).to.exist;
            expect(complications).to.be.an('array').that.includes('Malaria');
        });

        it('Should mark high risk and malaria positive if Paracheck PF', () => {
            programEncounter.setObservation(paracheck.name, 'Positive for PF');
            const decisions = motherEncounterDecision.getDecisions(programEncounter, referenceDate).encounterDecisions;
            const complications = TestHelper.findCodedValue(decisions, "High Risk Conditions");
            expect(complications).to.exist;
            expect(complications).to.be.an('array').that.includes('Malaria');
        });

        it('Should mark high risk and malaria positive if Paracheck PF and PV', () => {
            programEncounter.setObservation(paracheck.name, 'Positive for PF and PV');
            const decisions = motherEncounterDecision.getDecisions(programEncounter, referenceDate).encounterDecisions;
            const complications = TestHelper.findCodedValue(decisions, "High Risk Conditions");
            expect(complications).to.exist;
            expect(complications).to.be.an('array').that.includes('Malaria');
        });

    });

    describe('Malpresentation', () => {
        it("Shouldn't mark high risk if Paracheck negative", () => {
            programEncounter.setObservation('Foetal presentation', 'Cephalic');
            const decisions = motherEncounterDecision.getDecisions(programEncounter, referenceDate).encounterDecisions;
            const complications = TestHelper.findCodedValue(decisions, "High Risk Conditions");
            expect(complications).to.be.an('array').that.is.empty;
        });

        it('Should mark high risk and malaria positive if Paracheck PV', () => {
            programEncounter.setObservation('Foetal presentation', 'Breech');
            const decisions = motherEncounterDecision.getDecisions(programEncounter, referenceDate).encounterDecisions;
            const complications = TestHelper.findCodedValue(decisions, "High Risk Conditions");
            expect(complications).to.exist;
            expect(complications).to.be.an('array').that.includes('Malpresentation');
        });

        it('Should mark high risk and malaria positive if Paracheck PF', () => {
            programEncounter.setObservation('Foetal presentation', 'Transverse');
            const decisions = motherEncounterDecision.getDecisions(programEncounter, referenceDate).encounterDecisions;
            const complications = TestHelper.findCodedValue(decisions, "High Risk Conditions");
            expect(complications).to.exist;
            expect(complications).to.be.an('array').that.includes('Malpresentation');
        });
    });

    describe('Should show investigation advice (missing tests)', () => {
        it("show (multiple) HB and Urine Albumin missing", () => {
            programEncounter.setObservation(hb.name, undefined);
            programEncounter.setObservation(urineAlbumin.name, undefined);
            const decisions = motherEncounterDecision.getDecisions(programEncounter, referenceDate).encounterDecisions;
            const advices = C.findValue(decisions, 'Missing tests');
            expect(advices).to.include.members([hb.name, urineAlbumin.name]);
        });

        it("show (single) Urine Albumin missing", () => {
            programEncounter.setObservation(hb.name, 1);
            programEncounter.setObservation(urineAlbumin.name, undefined);
            const decisions = motherEncounterDecision.getDecisions(programEncounter, referenceDate).encounterDecisions;
            const advices = C.findValue(decisions, 'Missing tests');
            expect(advices).to.not.include(hb.name);
            expect(advices).to.include(urineAlbumin.name);
        });
    });
});
