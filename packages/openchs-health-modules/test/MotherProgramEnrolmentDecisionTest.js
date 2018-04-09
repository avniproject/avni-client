import ProgramFactory from "./ref/ProgramFactory";
import IndividualBuilder from "./ref/IndividualBuilder";
import program from "../health_modules/adolescent/metadata/adolescentProgram.json";
import motherConcepts from "../health_modules/mother/metadata/motherConcepts.json";
import commonConcepts from "../health_modules/commonConcepts.json";
import enrolmentForm from "../health_modules/mother/metadata/motherProgramEnrolmentForm.json";
import EnrolmentFiller from "./ref/EnrolmentFiller";

const moment = require('moment');
const assert = require('chai').assert;
const _ = require('lodash');
const motherEnrolmentDecision = require('../health_modules/mother/motherProgramEnrolmentDecision');
const C = require('../health_modules/common');

describe("Mother Program Enrolment", () => {
    let programData;

    beforeEach(() => {
        programData = new ProgramFactory(program)
            .withConcepts(commonConcepts)
            .withConcepts(motherConcepts)
            .withEnrolmentform(enrolmentForm)
            .build();
    });

    describe("Institutional Delivery and/or ANC", () => {
        it("should be advised if mother's age is less than 18", () => {
            const mother = new IndividualBuilder().withName("Test", "Mother")
                .withAge(17)
                .withGender("Female")
                .build();
            const enrolment = new EnrolmentFiller(programData, mother, new Date()).build();
            const decisions = motherEnrolmentDecision.getDecisions(enrolment, {}, new Date());
            assert.include(C.findValue(decisions.enrolmentDecisions, "Recommendations"), "Institutional Delivery");
        });

        it("should be advised if mother's age is more than 30", () => {
            const mother = new IndividualBuilder().withName("Test", "Mother")
                .withAge(31)
                .withGender("Female")
                .build();
            const enrolment = new EnrolmentFiller(programData, mother, new Date()).build();
            const decisions = motherEnrolmentDecision.getDecisions(enrolment, {}, new Date());
            assert.include(C.findValue(decisions.enrolmentDecisions, "Recommendations"), "Institutional Delivery");
        });

        it("shouldn't exist if mother's age is between 18 and 30", () => {
            const mother = new IndividualBuilder().withName("Test", "Mother")
                .withAge(25)
                .withGender("Female")
                .build();
            const enrolment = new EnrolmentFiller(programData, mother, new Date()).build();
            const decisions = motherEnrolmentDecision.getDecisions(enrolment, {}, new Date());
            assert.notInclude(C.findValue(decisions.enrolmentDecisions, "Recommendations"), "Institutional Delivery");
        });

        it("should be advised if Blood Group has an Rh Negative factor", () => {
            ["AB-", "O-", "A-", "B-"].forEach((bloodGroup) => {
                let mother = new IndividualBuilder(programData).withName("Test", "Mother")
                    .withAge(25)
                    .withGender("Female")
                    .withSingleCodedObservation("Blood group", bloodGroup)
                    .build();
                const enrolment = new EnrolmentFiller(programData, mother, new Date()).build();
                const decisions = motherEnrolmentDecision.getDecisions(enrolment, {}, new Date());
                assert.include(C.findValue(decisions.enrolmentDecisions, "Recommendations"), "Institutional Delivery", `For Blood Group: ${bloodGroup}`);
            });
        });

        it("shouldn't exist if Blood Group has an Rh Positive factor", () => {
            ["B+", "A+", "AB+", "O+"].forEach((bloodGroup) => {
                let mother = new IndividualBuilder(programData).withName("Test", "Mother")
                    .withAge(25)
                    .withGender("Female")
                    .withSingleCodedObservation("Blood group", bloodGroup)
                    .build();
                const enrolment = new EnrolmentFiller(programData, mother, new Date()).build();
                const decisions = motherEnrolmentDecision.getDecisions(enrolment, {}, new Date());
                assert.notInclude(C.findValue(decisions.enrolmentDecisions, "Recommendations"), "Institutional Delivery");
            });
        });


        it("should be advised if mother has Hypertension", () => {
            const mother = new IndividualBuilder(programData).withName("Test", "Mother")
                .withAge(25)
                .withGender("Female")
                .withMultiCodedObservation("Medical history", ["Hypertension"])
                .build();
            const enrolment = new EnrolmentFiller(programData, mother, new Date()).build();
            const decisions = motherEnrolmentDecision.getDecisions(enrolment, {}, new Date());
            assert.include(C.findValue(decisions.enrolmentDecisions, "Recommendations"), "Institutional Delivery");
            assert.include(C.findValue(decisions.enrolmentDecisions, "Recommendations"), "Institutional ANC");
        });

        it("should be advised if mother has Heart Disease", () => {
            const mother = new IndividualBuilder(programData).withName("Test", "Mother")
                .withAge(25)
                .withGender("Female")
                .withMultiCodedObservation("Medical history", ["Heart-related Diseases"])
                .build();
            const enrolment = new EnrolmentFiller(programData, mother, new Date()).build();
            const decisions = motherEnrolmentDecision.getDecisions(enrolment, {}, new Date());
            assert.include(C.findValue(decisions.enrolmentDecisions, "Recommendations"), "Institutional Delivery");
            assert.include(C.findValue(decisions.enrolmentDecisions, "Recommendations"), "Institutional ANC");
        });

        it("should be advised if mother has Diabetes", () => {
            const mother = new IndividualBuilder(programData).withName("Test", "Mother")
                .withAge(25)
                .withGender("Female")
                .withMultiCodedObservation("Medical history", ["Diabetes"])
                .build();
            const enrolment = new EnrolmentFiller(programData, mother, new Date()).build();
            const decisions = motherEnrolmentDecision.getDecisions(enrolment, {}, new Date());
            assert.include(C.findValue(decisions.enrolmentDecisions, "Recommendations"), "Institutional Delivery");
            assert.include(C.findValue(decisions.enrolmentDecisions, "Recommendations"), "Institutional ANC");
        });

        it("should be advised if mother has Sickle Cell", () => {
            const mother = new IndividualBuilder(programData).withName("Test", "Mother")
                .withAge(25)
                .withGender("Female")
                .withMultiCodedObservation("Medical history", ["Sickle Cell"])
                .build();
            const enrolment = new EnrolmentFiller(programData, mother, new Date()).build();
            const decisions = motherEnrolmentDecision.getDecisions(enrolment, {}, new Date());
            assert.include(C.findValue(decisions.enrolmentDecisions, "Recommendations"), "Institutional Delivery");
            assert.include(C.findValue(decisions.enrolmentDecisions, "Recommendations"), "Institutional ANC");
        });

        it("should be advised if mother has Epilepsy", () => {
            const mother = new IndividualBuilder(programData).withName("Test", "Mother")
                .withAge(25)
                .withGender("Female")
                .withMultiCodedObservation("Medical history", ["Epilepsy"])
                .build();
            const enrolment = new EnrolmentFiller(programData, mother, new Date()).build();
            const decisions = motherEnrolmentDecision.getDecisions(enrolment, {}, new Date());
            assert.include(C.findValue(decisions.enrolmentDecisions, "Recommendations"), "Institutional Delivery");
            assert.include(C.findValue(decisions.enrolmentDecisions, "Recommendations"), "Institutional ANC");
        });

        it("should be advised if mother has Renal Disease", () => {
            const mother = new IndividualBuilder(programData).withName("Test", "Mother")
                .withAge(25)
                .withGender("Female")
                .withMultiCodedObservation("Medical history", ["Renal Disease"])
                .build();
            const enrolment = new EnrolmentFiller(programData, mother, new Date()).build();
            const decisions = motherEnrolmentDecision.getDecisions(enrolment, {}, new Date());
            assert.include(C.findValue(decisions.enrolmentDecisions, "Recommendations"), "Institutional Delivery");
            assert.include(C.findValue(decisions.enrolmentDecisions, "Recommendations"), "Institutional ANC");
        });

        it("should be advised if mother has HIV/AIDS", () => {
            const mother = new IndividualBuilder(programData).withName("Test", "Mother")
                .withAge(25)
                .withGender("Female")
                .withMultiCodedObservation("Medical history", ["HIV/AIDS"])
                .build();
            const enrolment = new EnrolmentFiller(programData, mother, new Date()).build();
            const decisions = motherEnrolmentDecision.getDecisions(enrolment, {}, new Date());
            assert.include(C.findValue(decisions.enrolmentDecisions, "Recommendations"), "Institutional Delivery");
            assert.include(C.findValue(decisions.enrolmentDecisions, "Recommendations"), "Institutional ANC");
        });

        it("should be advised if mother has a short stature (height lesser than 145cms)", () => {
            const mother = new IndividualBuilder(programData).withName("Test", "Mother")
                .withAge(25)
                .withGender("Female")
                .build();
            const enrolment = new EnrolmentFiller(programData, mother, new Date())
                .forConcept("Height", 143)
                .build();
            const decisions = motherEnrolmentDecision.getDecisions(enrolment, {}, new Date());
            assert.include(C.findValue(decisions.enrolmentDecisions, "Recommendations"), "Institutional Delivery");
        });

        it("should be advised if mother has gravida 1", () => {
            const mother = new IndividualBuilder(programData).withName("Test", "Mother")
                .withAge(25)
                .withGender("Female")
                .build();
            const enrolment = new EnrolmentFiller(programData, mother, new Date())
                .forConcept("Gravida", 1)
                .build();
            const decisions = motherEnrolmentDecision.getDecisions(enrolment, {}, new Date());
            assert.include(C.findValue(decisions.enrolmentDecisions, "Recommendations"), "Institutional Delivery");
        });

        it("should be advised if age of youngest child less than 1", () => {
            const mother = new IndividualBuilder(programData).withName("Test", "Mother")
                .withAge(25)
                .withGender("Female")
                .build();
            let enrolment = new EnrolmentFiller(programData, mother, new Date())
                .forConcept("Age of youngest child", moment(new Date()).subtract(11, "months").toDate())
                .build();
            let decisions = motherEnrolmentDecision.getDecisions(enrolment, {}, new Date());
            assert.include(C.findValue(decisions.enrolmentDecisions, "Recommendations"), "Institutional Delivery");
            assert.include(C.findValue(decisions.enrolmentDecisions, "Recommendations"), "Institutional ANC");

            enrolment = new EnrolmentFiller(programData, mother, new Date())
                .forConcept("Age of youngest child", moment(new Date()).subtract(14, "months").toDate())
                .build();
            decisions = motherEnrolmentDecision.getDecisions(enrolment, {}, new Date());
            assert.notInclude(C.findValue(decisions.enrolmentDecisions, "Recommendations"), "Institutional Delivery");
            assert.notInclude(C.findValue(decisions.enrolmentDecisions, "Recommendations"), "Institutional ANC");
        });

        it("should be advised in case of past pregnancy complications", () => {
            const ancRequired = ["3 or more than 3 spontaneous abortions"];
            [
                "Ante Partum Haemorrhage", "Intrauterine Growth Retardation", "Pre-term labour", "Prolonged labour",
                "Instrumental Delivery", "LSCS/C-section", "Intrauterine death", "Threatened abortion",
                "3 or more than 3 spontaneous abortions", "Still Birth", "Multiple Births", "Retained Placenta",
                "Post Partum Haemorrhage", "Intrapartum Death", "Neonatal death within first 28 days",
                "Congenital anomaly"
            ].forEach((pastComplication) => {
                const mother = new IndividualBuilder(programData).withName("Test", "Mother")
                    .withAge(25)
                    .withGender("Female")
                    .build();
                const enrolment = new EnrolmentFiller(programData, mother, new Date())
                    .forMultiCoded("Obstetrics history", [pastComplication])
                    .build();
                let decisions = motherEnrolmentDecision.getDecisions(enrolment, {}, new Date());
                assert.include(C.findValue(decisions.enrolmentDecisions, "Recommendations"), "Institutional Delivery");
                if (ancRequired.indexOf(pastComplication) > -1) {
                    assert.include(C.findValue(decisions.enrolmentDecisions, "Recommendations"), "Institutional ANC");
                }
            });
        });

    });

    describe("High Risk Pregnancy", () => {
        it("should be highlighted if mother's age is less than 18", () => {
            const mother = new IndividualBuilder().withName("Test", "Mother")
                .withAge(17)
                .withGender("Female")
                .build();
            const enrolment = new EnrolmentFiller(programData, mother, new Date()).build();
            const decisions = motherEnrolmentDecision.getDecisions(enrolment, {}, new Date());
            assert.include(C.findValue(decisions.enrolmentDecisions, "High Risk Conditions"), "Under age pregnancy");
        });

        it("should be highlighted if mother's age is more than 30", () => {
            const mother = new IndividualBuilder().withName("Test", "Mother")
                .withAge(31)
                .withGender("Female")
                .build();
            const enrolment = new EnrolmentFiller(programData, mother, new Date()).build();
            const decisions = motherEnrolmentDecision.getDecisions(enrolment, {}, new Date());
            assert.include(C.findValue(decisions.enrolmentDecisions, "High Risk Conditions"), "Old age pregnancy");
        });

        it("shouldn't highlight if mother's age is between 18 and 30", () => {
            const mother = new IndividualBuilder().withName("Test", "Mother")
                .withAge(25)
                .withGender("Female")
                .build();
            const enrolment = new EnrolmentFiller(programData, mother, new Date()).build();
            const decisions = motherEnrolmentDecision.getDecisions(enrolment, {}, new Date());
            assert.lengthOf(C.findValue(decisions.enrolmentDecisions, "High Risk Conditions"), 0);
        });

        it("should be highlighted if Blood Group has an Rh Negative factor", () => {
            ["AB-", "O-", "A-", "B-"].forEach((bloodGroup) => {
                let mother = new IndividualBuilder(programData).withName("Test", "Mother")
                    .withAge(25)
                    .withGender("Female")
                    .withSingleCodedObservation("Blood group", bloodGroup)
                    .build();
                const enrolment = new EnrolmentFiller(programData, mother, new Date()).build();
                const decisions = motherEnrolmentDecision.getDecisions(enrolment, {}, new Date());
                assert.include(C.findValue(decisions.enrolmentDecisions, "High Risk Conditions"), "Rh Negative Blood Group", `For Blood Group: ${bloodGroup}`);
            });
        });

        it("shouldn't be highlighted if Blood Group has an Rh Positive factor", () => {
            ["B+", "A+", "AB+", "O+"].forEach((bloodGroup) => {
                let mother = new IndividualBuilder(programData).withName("Test", "Mother")
                    .withAge(25)
                    .withGender("Female")
                    .withSingleCodedObservation("Blood group", bloodGroup)
                    .build();
                const enrolment = new EnrolmentFiller(programData, mother, new Date()).build();
                const decisions = motherEnrolmentDecision.getDecisions(enrolment, {}, new Date());
                assert.notInclude(C.findValue(decisions.enrolmentDecisions, "High Risk Conditions"), "Rh Negative Blood Group", `For Blood Group: ${bloodGroup}`);
            });
        });


        it("should be highlighted if mother has Hypertension", () => {
            const mother = new IndividualBuilder(programData).withName("Test", "Mother")
                .withAge(25)
                .withGender("Female")
                .withMultiCodedObservation("Medical history", ["Hypertension"])
                .build();
            const enrolment = new EnrolmentFiller(programData, mother, new Date()).build();
            const decisions = motherEnrolmentDecision.getDecisions(enrolment, {}, new Date());
            assert.include(C.findValue(decisions.enrolmentDecisions, "High Risk Conditions"), "Chronic Hypertension");
        });

        it("should be advised if mother has Heart Disease", () => {
            const mother = new IndividualBuilder(programData).withName("Test", "Mother")
                .withAge(25)
                .withGender("Female")
                .withMultiCodedObservation("Medical history", ["Heart-related Diseases"])
                .build();
            const enrolment = new EnrolmentFiller(programData, mother, new Date()).build();
            const decisions = motherEnrolmentDecision.getDecisions(enrolment, {}, new Date());
            assert.include(C.findValue(decisions.enrolmentDecisions, "High Risk Conditions"), "Heart Disease");
        });

        it("should be advised if mother has Diabetes", () => {
            const mother = new IndividualBuilder(programData).withName("Test", "Mother")
                .withAge(25)
                .withGender("Female")
                .withMultiCodedObservation("Medical history", ["Diabetes"])
                .build();
            const enrolment = new EnrolmentFiller(programData, mother, new Date()).build();
            const decisions = motherEnrolmentDecision.getDecisions(enrolment, {}, new Date());
            assert.include(C.findValue(decisions.enrolmentDecisions, "High Risk Conditions"), "Diabetes");
        });

        it("should be advised if mother has Sickle Cell", () => {
            const mother = new IndividualBuilder(programData).withName("Test", "Mother")
                .withAge(25)
                .withGender("Female")
                .withMultiCodedObservation("Medical history", ["Sickle Cell"])
                .build();
            const enrolment = new EnrolmentFiller(programData, mother, new Date()).build();
            const decisions = motherEnrolmentDecision.getDecisions(enrolment, {}, new Date());
            assert.include(C.findValue(decisions.enrolmentDecisions, "High Risk Conditions"), "Sickle Cell");
        });

        it("should be advised if mother has Epilepsy", () => {
            const mother = new IndividualBuilder(programData).withName("Test", "Mother")
                .withAge(25)
                .withGender("Female")
                .withMultiCodedObservation("Medical history", ["Epilepsy"])
                .build();
            const enrolment = new EnrolmentFiller(programData, mother, new Date()).build();
            const decisions = motherEnrolmentDecision.getDecisions(enrolment, {}, new Date());
            assert.include(C.findValue(decisions.enrolmentDecisions, "High Risk Conditions"), "Epilepsy");
        });

        it("should be advised if mother has Renal Disease", () => {
            const mother = new IndividualBuilder(programData).withName("Test", "Mother")
                .withAge(25)
                .withGender("Female")
                .withMultiCodedObservation("Medical history", ["Renal Disease"])
                .build();
            const enrolment = new EnrolmentFiller(programData, mother, new Date()).build();
            const decisions = motherEnrolmentDecision.getDecisions(enrolment, {}, new Date());
            assert.include(C.findValue(decisions.enrolmentDecisions, "High Risk Conditions"), "Renal Disease");
        });

        it("should be advised if mother has HIV/AIDS", () => {
            const mother = new IndividualBuilder(programData).withName("Test", "Mother")
                .withAge(25)
                .withGender("Female")
                .withMultiCodedObservation("Medical history", ["HIV/AIDS"])
                .build();
            const enrolment = new EnrolmentFiller(programData, mother, new Date()).build();
            const decisions = motherEnrolmentDecision.getDecisions(enrolment, {}, new Date());
            assert.include(C.findValue(decisions.enrolmentDecisions, "High Risk Conditions"), "HIV/AIDS");
        });

    });
});