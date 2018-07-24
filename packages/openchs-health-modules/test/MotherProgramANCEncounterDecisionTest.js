import ProgramFactory from "./ref/ProgramFactory";
import IndividualBuilder from "./ref/IndividualBuilder";
import program from "../health_modules/adolescent/metadata/adolescentProgram.json";
import motherConcepts from "../health_modules/mother/metadata/motherConcepts.json";
import commonConcepts from "../health_modules/commonConcepts.json";
import enrolmentForm from "../health_modules/mother/metadata/motherProgramEnrolmentForm.json";
import ancForm from "../health_modules/mother/metadata/motherANCForm";
import EnrolmentFiller from "./ref/EnrolmentFiller";
import EncounterFiller from "./ref/EncounterFiller";

const moment = require('moment');
const assert = require('chai').assert;
const _ = require('lodash');
const motherEncounterDecision = require('../health_modules/mother/motherProgramEncounterDecision');
const C = require('../health_modules/common');

describe("Mother Program ANC", () => {
    let refDate = moment('2018-01-01');
    let programData, enrolment, individual, decisions;


    beforeEach(() => {
        programData = new ProgramFactory(program)
            .withConcepts(commonConcepts)
            .withConcepts(motherConcepts)
            .withEnrolmentform(enrolmentForm)
            .withEncounterForm(ancForm)
            .build();
        individual = new IndividualBuilder(programData)
            .withName("Test", "Mother")
            .withAge(25)
            .withGender("Female")
            .withSingleCodedObservation("Blood group", "B+")
            .build();
        enrolment = new EnrolmentFiller(programData, individual, new Date())
            .build();
        decisions = {encounterDecisions: [], encounterDecisions: []};
    });

    describe("Institutional Delivery and ANC", () => {
        it("is not carried over from every encounter and enrolment", () => {
            let ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                .forConcept("Systolic", 90)
                .build();
            decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
            assert.notInclude(C.findValue(decisions.encounterDecisions, "Recommendations"), "Institutional Delivery");
            assert.notInclude(C.findValue(decisions.encounterDecisions, "Recommendations"), "Institutional ANC");

            enrolment = new EnrolmentFiller(programData, individual, new Date())
                .forMultiCoded("Recommendations", ["Institutional Delivery", "Institutional ANC"])
                .build();

            ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                .forConcept("Systolic", 89)
                .build();
            decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
            assert.notInclude(C.findValue(decisions.encounterDecisions, "Recommendations"), "Institutional Delivery");
            assert.notInclude(C.findValue(decisions.encounterDecisions, "Recommendations"), "Institutional ANC");
        });

        it("is advised for hypertension", () => {
            let ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                .forConcept("Systolic", 141)
                .build();
            decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
            assert.include(C.findValue(decisions.encounterDecisions, "Recommendations"), "Institutional Delivery");
            assert.include(C.findValue(decisions.encounterDecisions, "Recommendations"), "Institutional ANC");

            ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                .forConcept("Diastolic", 91)
                .build();
            decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
            assert.include(C.findValue(decisions.encounterDecisions, "Recommendations"), "Institutional Delivery");
            assert.include(C.findValue(decisions.encounterDecisions, "Recommendations"), "Institutional ANC");
        });

        it("is advised if Urine Albumin is Trace or more", () => {
            ["Trace", "+1", "+2", "+3", "+4"].forEach((result) => {
                let ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                    .forSingleCoded("Urine Albumin", result)
                    .build();
                decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
                assert.include(C.findValue(decisions.encounterDecisions, "Recommendations"), "Institutional Delivery");
                assert.include(C.findValue(decisions.encounterDecisions, "Recommendations"), "Institutional ANC");
            });
        });

        it("is advised if Urine Sugar is Trace or more", () => {
            ["Trace", "+1", "+2", "+3", "+4"].forEach((result) => {
                let ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                    .forSingleCoded("Urine Sugar", result)
                    .build();
                decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
                assert.include(C.findValue(decisions.encounterDecisions, "Recommendations"), "Institutional Delivery");
                assert.include(C.findValue(decisions.encounterDecisions, "Recommendations"), "Institutional ANC");
            });
        });

        it("is advised if more than 1 foetus", () => {
            ["Two", "Three", "More than three"].forEach((result) => {
                let ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                    .forSingleCoded("USG Scanning Report - Number of foetus", result)
                    .build();
                decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
                assert.include(C.findValue(decisions.encounterDecisions, "Recommendations"), "Institutional Delivery");
                assert.include(C.findValue(decisions.encounterDecisions, "Recommendations"), "Institutional ANC");
            });
        });

        it("is advised if more liquour increased or decreased", () => {
            ["Increased", "Decreased"].forEach((result) => {
                let ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                    .forSingleCoded("USG Scanning Report - Liquour", result)
                    .build();
                decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
                assert.include(C.findValue(decisions.encounterDecisions, "Recommendations"), "Institutional Delivery");
                assert.include(C.findValue(decisions.encounterDecisions, "Recommendations"), "Institutional ANC");
            });
        });

        it("is advised if placenta previa", () => {
            let ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                .forSingleCoded("USG Scanning Report - Placenta Previa", "Previa")
                .build();
            decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
            assert.include(C.findValue(decisions.encounterDecisions, "Recommendations"), "Institutional Delivery");
            assert.include(C.findValue(decisions.encounterDecisions, "Recommendations"), "Institutional ANC");
        });

        it("is advised if foetal presentation is transverse or breech", () => {
            ["Breech", "Transverse"].forEach((result) => {
                let ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                    .forSingleCoded("Foetal presentation", result)
                    .build();
                decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
                assert.include(C.findValue(decisions.encounterDecisions, "Recommendations"), "Institutional Delivery");
                assert.include(C.findValue(decisions.encounterDecisions, "Recommendations"), "Institutional ANC");
            });
        });
    });

    describe("Institutional Delivery", () => {
        it("is advised if VDRL is positive", () => {
            ["Positive"].forEach((result) => {
                let ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                    .forSingleCoded("VDRL", result)
                    .build();
                decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
                assert.include(C.findValue(decisions.encounterDecisions, "Recommendations"), "Institutional Delivery");
            });
        });

        it("is advised if HIV/AIDS Test is positive", () => {
            ["Positive"].forEach((result) => {
                let ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                    .forSingleCoded("HIV/AIDS Test", result)
                    .build();
                decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
                assert.include(C.findValue(decisions.encounterDecisions, "Recommendations"), "Institutional Delivery");
            });
        });

        it("is advised if HbsAg is positive", () => {
            ["Positive"].forEach((result) => {
                let ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                    .forSingleCoded("HbsAg", result)
                    .build();
                decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
                assert.include(C.findValue(decisions.encounterDecisions, "Recommendations"), "Institutional Delivery");
            });
        });

        it("is advised if Sickling Test is positive", () => {
            ["Positive"].forEach((result) => {
                let ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                    .forSingleCoded("Sickling Test", result)
                    .build();
                decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
                assert.include(C.findValue(decisions.encounterDecisions, "Recommendations"), "Institutional Delivery");
            });
        });

        it("is advised if Hb Electrophoresis is SS", () => {
            ["SS"].forEach((result) => {
                let ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                    .forSingleCoded("Hb Electrophoresis", result)
                    .build();
                decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
                assert.include(C.findValue(decisions.encounterDecisions, "Recommendations"), "Institutional Delivery");
            });
        });
    });

    describe("Treatment", () => {
        it("Doxinate 1OD/BD for 10 days is advised in case of Morning Sickness for the first 2 trimesters", () => {
            enrolment = new EnrolmentFiller(programData, individual, new Date())
                .forConcept("Last menstrual period", moment().subtract(16, "w").toDate())
                .build();
            let ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                .forMultiCoded("Pregnancy complications", ["Morning Sickness"])
                .build();
            decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
            assert.include(C.findValue(decisions.encounterDecisions, "Treatment"), "Doxinate 1 OD/BD for 10 Days");
        });

        it("Doxinate is not advised if Morning Sickness in the last trimester", () => {
            enrolment = new EnrolmentFiller(programData, individual, new Date())
                .forConcept("Last menstrual period", moment().subtract(33, "w").toDate())
                .build();
            let ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                .forMultiCoded("Pregnancy complications", ["Morning Sickness"])
                .build();
            decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
            assert.notInclude(C.findValue(decisions.encounterDecisions, "Treatment"), "Doxinate 1 OD/BD for 10 Days");
        });

        it("Doxinate 1OD/BD for 10 days is advised in case of Morning Sickness for the first 2 trimesters", () => {
            enrolment = new EnrolmentFiller(programData, individual, new Date())
                .forConcept("Last menstrual period", moment().subtract(16, "w").toDate())
                .build();
            let ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                .forMultiCoded("Pregnancy complications", ["Excessive vomiting and inability to consume anything orally"])
                .build();
            decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
            assert.include(C.findValue(decisions.encounterDecisions, "Treatment"), "Doxinate 1 OD/BD for 10 Days");
        });

        it("Folic acid is advised for the first trimester", () => {
            enrolment = new EnrolmentFiller(programData, individual, new Date())
                .forConcept("Last menstrual period", moment().subtract(11, "w").toDate())
                .build();
            let ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                .build();
            decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
            assert.include(C.findValue(decisions.encounterDecisions, "Treatment"), "Folic acid (1 OD)");
        });

        it("Folic acid is not advised for the second and third trimester", () => {
            enrolment = new EnrolmentFiller(programData, individual, new Date())
                .forConcept("Last menstrual period", moment().subtract(13, "w").toDate())
                .build();
            let ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                .build();
            decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
            assert.notInclude(C.findValue(decisions.encounterDecisions, "Treatment"), "Folic acid (1 OD)");

            enrolment = new EnrolmentFiller(programData, individual, new Date())
                .forConcept("Last menstrual period", moment().subtract(29, "w").toDate())
                .build();
            ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                .build();
            decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
            assert.notInclude(C.findValue(decisions.encounterDecisions, "Treatment"), "Folic acid (1 OD)");
        });

        it("Ferrous Sulphate (100mg) is advised for the last 2 trimesters and when Hb>=11g/dl", () => {
            enrolment = new EnrolmentFiller(programData, individual, new Date())
                .forConcept("Last menstrual period", moment().subtract(13, "w").toDate())
                .build();
            let ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                .forConcept("Hb", 11)
                .build();
            decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
            assert.include(C.findValue(decisions.encounterDecisions, "Treatment"), "Ferrous Sulphate (100mg) 1 OD");
            assert.notInclude(C.findValue(decisions.encounterDecisions, "Treatment"), "Ferrous Sulphate (200mg) 1 OD");

            enrolment = new EnrolmentFiller(programData, individual, new Date())
                .forConcept("Last menstrual period", moment().subtract(29, "w").toDate())
                .build();
            ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                .forConcept("Hb", 12)
                .build();
            decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
            assert.include(C.findValue(decisions.encounterDecisions, "Treatment"), "Ferrous Sulphate (100mg) 1 OD");
            assert.notInclude(C.findValue(decisions.encounterDecisions, "Treatment"), "Ferrous Sulphate (200mg) 1 OD");
        });

        it("Ferrous Sulphate (200mg) 1 OD is advised for the last 2 trimesters and when 8g/dl<=Hb<11g/dl", () => {
            enrolment = new EnrolmentFiller(programData, individual, new Date())
                .forConcept("Last menstrual period", moment().subtract(13, "w").toDate())
                .build();
            let ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                .forConcept("Hb", 8)
                .build();
            decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
            assert.include(C.findValue(decisions.encounterDecisions, "Treatment"), "Ferrous Sulphate (200mg) 1 OD");
            assert.notInclude(C.findValue(decisions.encounterDecisions, "Treatment"), "Ferrous Sulphate (100mg) 1 OD");

            enrolment = new EnrolmentFiller(programData, individual, new Date())
                .forConcept("Last menstrual period", moment().subtract(29, "w").toDate())
                .build();
            ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                .forConcept("Hb", 8)
                .build();
            decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
            assert.include(C.findValue(decisions.encounterDecisions, "Treatment"), "Ferrous Sulphate (200mg) 1 OD");
            assert.notInclude(C.findValue(decisions.encounterDecisions, "Treatment"), "Ferrous Sulphate (100mg) 1 OD");
        });


        it("Ferrous Sulphate isn't advised in the first trimester of pregnancy", () => {
            enrolment = new EnrolmentFiller(programData, individual, new Date())
                .forConcept("Last menstrual period", moment().subtract(11, "w").toDate())
                .build();
            let ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                .forConcept("Hb", 8)
                .build();
            decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
            assert.notInclude(C.findValue(decisions.encounterDecisions, "Treatment"), "Ferrous Sulphate (100mg) 1 OD");
            assert.notInclude(C.findValue(decisions.encounterDecisions, "Treatment"), "Ferrous Sulphate (200mg) 1 OD");

            enrolment = new EnrolmentFiller(programData, individual, new Date())
                .forConcept("Last menstrual period", moment().subtract(12, "w").toDate())
                .build();
            ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                .forConcept("Hb", 8)
                .build();
            decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
            assert.notInclude(C.findValue(decisions.encounterDecisions, "Treatment"), "Ferrous Sulphate (100mg) 1 OD");
            assert.notInclude(C.findValue(decisions.encounterDecisions, "Treatment"), "Ferrous Sulphate (200mg) 1 OD");
        });

        it("Calcium isn't advised in the first trimester of pregnancy", () => {
            enrolment = new EnrolmentFiller(programData, individual, new Date())
                .forConcept("Last menstrual period", moment().subtract(11, "w").toDate())
                .build();
            let ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                .build();
            decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
            assert.notInclude(C.findValue(decisions.encounterDecisions, "Treatment"), "Calcium 1g/day");

            enrolment = new EnrolmentFiller(programData, individual, new Date())
                .forConcept("Last menstrual period", moment().subtract(12, "w").toDate())
                .build();
            ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                .build();
            decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
            assert.notInclude(C.findValue(decisions.encounterDecisions, "Treatment"), "Calcium 1g/day");
        });

        it("Calcium is advised in the last 2 trimesters of pregnancy", () => {
            enrolment = new EnrolmentFiller(programData, individual, new Date())
                .forConcept("Last menstrual period", moment().subtract(13, "w").toDate())
                .build();
            let ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                .build();
            decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
            assert.include(C.findValue(decisions.encounterDecisions, "Treatment"), "Calcium 1g/day");

            enrolment = new EnrolmentFiller(programData, individual, new Date())
                .forConcept("Last menstrual period", moment().subtract(29, "w").toDate())
                .build();
            ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                .build();
            decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
            assert.include(C.findValue(decisions.encounterDecisions, "Treatment"), "Calcium 1g/day");
        });

        it("Aspirin is advised in the last 2 trimesters of pregnancy till 35th week", () => {
            enrolment = new EnrolmentFiller(programData, individual, new Date())
                .forConcept("Last menstrual period", moment().subtract(13, "w").toDate())
                .build();
            let ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                .build();
            decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
            assert.include(C.findValue(decisions.encounterDecisions, "Treatment"), "Aspirin 75mg once a day");

            enrolment = new EnrolmentFiller(programData, individual, new Date())
                .forConcept("Last menstrual period", moment().subtract(29, "w").toDate())
                .build();
            ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                .build();
            decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
            assert.include(C.findValue(decisions.encounterDecisions, "Treatment"), "Aspirin 75mg once a day");

            enrolment = new EnrolmentFiller(programData, individual, new Date())
                .forConcept("Last menstrual period", moment().subtract(36, "w").toDate())
                .build();
            ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                .build();
            decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
            assert.notInclude(C.findValue(decisions.encounterDecisions, "Treatment"), "Aspirin 75mg once a day");

            enrolment = new EnrolmentFiller(programData, individual, new Date())
                .forConcept("Last menstrual period", moment().subtract(5, "w").toDate())
                .build();
            ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                .build();
            decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
            assert.notInclude(C.findValue(decisions.encounterDecisions, "Treatment"), "Aspirin 75mg once a day");
        });
    });

    describe("Referral", () => {
        ["Excessive vomiting and inability to consume anything orally", "Severe Abdominal Pain", "Blurred vision",
            "Decreased Foetal movements", "Per vaginal bleeding", "PV leaking"].forEach((complication) => {
            it(`is generated if ${complication}`, () => {
                let ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                    .forMultiCoded("Pregnancy complications", [complication])
                    .build();
                decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
                assert.include(C.findValue(decisions.encounterDecisions, "Refer to the hospital immediately for"), complication);
            });
        });

        it("is generated if mother is having convulsions", () => {
            let ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                .forSingleCoded("Has she been having convulsions?", "Present")
                .build();
            decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
            assert.include(C.findValue(decisions.encounterDecisions, "Refer to the hospital immediately for"), "Convulsions");
        });

        it("is generated if mother is has Jaundice", () => {
            let ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                .forSingleCoded("Jaundice (Icterus)", "Present")
                .build();
            decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
            assert.include(C.findValue(decisions.encounterDecisions, "Refer to the hospital immediately for"), "Jaundice");
        });

        ["Flat", "Retracted"].forEach((nippleState) => {
            it(`is generated if mother has ${nippleState} nipples`, () => {
                let ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                    .forSingleCoded("Breast Examination - Nipple", nippleState)
                    .build();
                decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
                assert.include(C.findValue(decisions.encounterDecisions, "Refer to the hospital for"), `${nippleState} Nipples`);
            });
        });

        it("is generated if mother gains more than 2 KGs in 4 weeks", () => {
            const lmp = refDate.subtract(32, "w").toDate();
            const encounter1DateTime = moment(lmp).add(14, "w").toDate();
            const encounter2DateTime = moment(lmp).add(18, "w").toDate();
            enrolment = new EnrolmentFiller(programData, individual, lmp)
                .forConcept("Last menstrual period", lmp)
                .build();
            let anc1Encounter = new EncounterFiller(programData, enrolment, "ANC", encounter1DateTime)
                .forConcept("Weight", 55)
                .build();
            let anc2Encounter = new EncounterFiller(programData, enrolment, "ANC", encounter2DateTime)
                .forConcept("Weight", 55 + 3)
                .build();
            enrolment.encounters = [anc1Encounter, anc2Encounter];
            decisions = motherEncounterDecision.getDecisions(anc2Encounter, encounter2DateTime);
            assert.include(C.findValue(decisions.encounterDecisions, "Refer to the hospital for"), "Irregular weight gain");
        });

        it("is generated if mother gains less than 1.7 KGs in 4 weeks", () => {
            const lmp = refDate.subtract(32, "w").toDate();
            const encounter1DateTime = moment(lmp).add(14, "w").toDate();
            const encounter2DateTime = moment(lmp).add(18, "w").toDate();
            enrolment = new EnrolmentFiller(programData, individual, lmp)
                .forConcept("Last menstrual period", lmp)
                .build();
            let anc1Encounter = new EncounterFiller(programData, enrolment, "ANC", encounter1DateTime)
                .forConcept("Weight", 55)
                .build();
            let anc2Encounter = new EncounterFiller(programData, enrolment, "ANC", encounter2DateTime)
                .forConcept("Weight", 55 + 1.5)
                .build();
            enrolment.encounters = [anc1Encounter, anc2Encounter];
            decisions = motherEncounterDecision.getDecisions(anc2Encounter, encounter2DateTime);
            assert.include(C.findValue(decisions.encounterDecisions, "Refer to the hospital for"), "Irregular weight gain");
        });

        it("is not generated if mother gains between 1.7...2 KGs in 4 weeks", () => {
            const lmp = refDate.subtract(32, "w").toDate();
            const encounter1DateTime = moment(lmp).add(14, "w").toDate();
            const encounter2DateTime = moment(lmp).add(18, "w").toDate();
            enrolment = new EnrolmentFiller(programData, individual, lmp)
                .forConcept("Last menstrual period", lmp)
                .build();
            let anc1Encounter = new EncounterFiller(programData, enrolment, "ANC", encounter1DateTime)
                .forConcept("Weight", 55)
                .build();
            let anc2Encounter = new EncounterFiller(programData, enrolment, "ANC", encounter2DateTime)
                .forConcept("Weight", 55 + 1.8)
                .build();
            enrolment.encounters = [anc1Encounter, anc2Encounter];
            decisions = motherEncounterDecision.getDecisions(anc2Encounter, encounter2DateTime);
            assert.notInclude(C.findValue(decisions.encounterDecisions, "Refer to the hospital for"), "Irregular weight gain");
        });

        it("is generated if fundal height from pubic symphysis increase is more than 1 cm per week", () => {
            const lmp = moment().subtract(28, "w").toDate();
            const encounter1DateTime = moment().subtract(3, "w").toDate();
            enrolment = new EnrolmentFiller(programData, individual, lmp)
                .forConcept("Last menstrual period", lmp)
                .build();
            let anc1Encounter = new EncounterFiller(programData, enrolment, "ANC", encounter1DateTime)
                .forConcept("Fundal height from pubic symphysis", 500)
                .build();
            let anc2Encounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                .forConcept("Fundal height from pubic symphysis", 506)
                .build();
            enrolment.encounters = [anc1Encounter, anc2Encounter];
            decisions = motherEncounterDecision.getDecisions(anc2Encounter, new Date());
            assert.include(C.findValue(decisions.encounterDecisions, "Refer to the hospital for"), "Irregular fundal height increase");
        });

        it("is generated if fundal height from pubic symphysis increase is less than 1 cm per week", () => {
            const lmp = moment().subtract(28, "w").toDate();
            const encounter1DateTime = moment().subtract(3, "w").toDate();
            enrolment = new EnrolmentFiller(programData, individual, lmp)
                .forConcept("Last menstrual period", lmp)
                .build();
            let anc1Encounter = new EncounterFiller(programData, enrolment, "ANC", encounter1DateTime)
                .forConcept("Fundal height from pubic symphysis", 500)
                .build();
            let anc2Encounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                .forConcept("Fundal height from pubic symphysis", 502)
                .build();
            enrolment.encounters = [anc1Encounter, anc2Encounter];
            decisions = motherEncounterDecision.getDecisions(anc2Encounter, new Date());
            assert.include(C.findValue(decisions.encounterDecisions, "Refer to the hospital for"), "Irregular fundal height increase");
        });

        it("is not generated if fundal height from pubic symphysis increase is 1 cm per week", () => {
            const lmp = moment().subtract(28, "w").toDate();
            const encounter1DateTime = moment().subtract(3, "w").toDate();
            enrolment = new EnrolmentFiller(programData, individual, lmp)
                .forConcept("Last menstrual period", lmp)
                .build();
            let anc1Encounter = new EncounterFiller(programData, enrolment, "ANC", encounter1DateTime)
                .forConcept("Fundal height from pubic symphysis", 500)
                .build();
            let anc2Encounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                .forConcept("Fundal height from pubic symphysis", 503)
                .build();
            enrolment.encounters = [anc1Encounter, anc2Encounter];
            decisions = motherEncounterDecision.getDecisions(anc2Encounter, new Date());
            assert.notInclude(C.findValue(decisions.encounterDecisions, "Refer to the hospital for"), "Irregular fundal height increase");
        });

        it("is generated if abdominal girth is more than 2.5 cm per week", () => {
            const lmp = moment().subtract(35, "w").toDate();
            const encounter1DateTime = moment().subtract(3, "w").toDate();
            enrolment = new EnrolmentFiller(programData, individual, lmp)
                .forConcept("Last menstrual period", lmp)
                .build();
            let anc1Encounter = new EncounterFiller(programData, enrolment, "ANC", encounter1DateTime)
                .forConcept("Abdominal girth", 500)
                .build();
            let anc2Encounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                .forConcept("Abdominal girth", 509)
                .build();
            enrolment.encounters = [anc1Encounter, anc2Encounter];
            decisions = motherEncounterDecision.getDecisions(anc2Encounter, new Date());
            assert.include(C.findValue(decisions.encounterDecisions, "Refer to the hospital for"), "Irregular abdominal girth increase");
        });

        it("is generated if abdominal girth increase is less than 2.5 cm per week", () => {
            const lmp = moment().subtract(35, "w").toDate();
            const encounter1DateTime = moment().subtract(3, "w").toDate();
            enrolment = new EnrolmentFiller(programData, individual, lmp)
                .forConcept("Last menstrual period", lmp)
                .build();
            let anc1Encounter = new EncounterFiller(programData, enrolment, "ANC", encounter1DateTime)
                .forConcept("Abdominal girth", 500)
                .build();
            let anc2Encounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                .forConcept("Abdominal girth", 501)
                .build();
            enrolment.encounters = [anc1Encounter, anc2Encounter];
            decisions = motherEncounterDecision.getDecisions(anc2Encounter, new Date());
            assert.include(C.findValue(decisions.encounterDecisions, "Refer to the hospital for"), "Irregular abdominal girth increase");
        });

        it("is not generated if abdominal girth increase is 2.5 cm per week", () => {
            const lmp = moment().subtract(35, "w").toDate();
            const encounter1DateTime = moment().subtract(3, "w").toDate();
            enrolment = new EnrolmentFiller(programData, individual, lmp)
                .forConcept("Last menstrual period", lmp)
                .build();
            let anc1Encounter = new EncounterFiller(programData, enrolment, "ANC", encounter1DateTime)
                .forConcept("Abdominal girth", 500)
                .build();
            let anc2Encounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                .forConcept("Abdominal girth", 507.5)
                .build();
            enrolment.encounters = [anc1Encounter, anc2Encounter];
            decisions = motherEncounterDecision.getDecisions(anc2Encounter, new Date());
            assert.notInclude(C.findValue(decisions.encounterDecisions, "Refer to the hospital for"), "Irregular abdominal girth increase");
        });

        it("is generated if foetal movements reduced or absent", () => {
            let ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                .forSingleCoded("Foetal movements", "Absent")
                .build();
            decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
            assert.include(C.findValue(decisions.encounterDecisions, "Refer to the hospital immediately for"), "Foetal movements absent");

            ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                .forSingleCoded("Foetal movements", "Reduced")
                .build();
            decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
            assert.include(C.findValue(decisions.encounterDecisions, "Refer to the hospital immediately for"), "Foetal movements reduced");
        });

        it("is generated if foetal heart sound is irregular or absent", () => {
            let ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                .forSingleCoded("Foetal Heart Sound", "Present and Irregular")
                .build();
            decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
            assert.include(C.findValue(decisions.encounterDecisions, "Refer to the hospital immediately for"), "Foetal heart sound irregular");

            ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                .forSingleCoded("Foetal Heart Sound", "Absent")
                .build();
            decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
            assert.include(C.findValue(decisions.encounterDecisions, "Refer to the hospital immediately for"), "Foetal heart sound absent");
        });

        it("is generated if foetal heart heart rate is less than 120 or greater than 160", () => {
            let ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                .forConcept("Foetal Heart Rate", 119)
                .build();
            decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
            assert.include(C.findValue(decisions.encounterDecisions, "Refer to the hospital immediately for"), "Foetal heart rate irregular");

            ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                .forConcept("Foetal Heart Rate", 161)
                .build();
            decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
            assert.include(C.findValue(decisions.encounterDecisions, "Refer to the hospital immediately for"), "Foetal heart rate irregular");
        });

        it("is not generated if foetal heart heart rate is between 120 and 160", () => {
            let ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                .forConcept("Foetal Heart Rate", 121)
                .build();
            decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
            assert.notInclude(C.findValue(decisions.encounterDecisions, "Refer to the hospital immediately for"), "Foetal heart rate irregular");
        });

        it("is generated for hypertension (Systolic > 140 or Diastolic > 90)", () => {
            let ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                .forConcept("Systolic", 141)
                .build();
            decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
            assert.include(C.findValue(decisions.encounterDecisions, "Refer to the hospital immediately for"), "Hypertension");

            ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                .forConcept("Diastolic", 91)
                .build();
            decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
            assert.include(C.findValue(decisions.encounterDecisions, "Refer to the hospital immediately for"), "Hypertension");
        });

        it("is generated for fever (temperature > 99)", () => {
            let ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                .forConcept("Temperature", 100)
                .build();
            decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
            assert.include(C.findValue(decisions.encounterDecisions, "Refer to the hospital immediately for"), "Fever");
        });

        [
            "Positive for PF",
            "Positive for PF and PV",
            "Positive for PV"
        ].forEach((paracheckResult) => {
            it(`is generated for Paracheck ${paracheckResult}`, () => {
                let ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                    .forSingleCoded("Paracheck", paracheckResult)
                    .build();
                decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
                assert.include(C.findValue(decisions.encounterDecisions, "Refer to the hospital immediately for"), "Abnormal Paracheck");
            });
        });

        it(`is generated for low Hb (< 8g/dl)`, () => {
            let ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                .forConcept("Hb", 7)
                .build();
            decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
            assert.include(C.findValue(decisions.encounterDecisions, "Refer to the hospital immediately for"), "Abnormal Hb");

            ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                .forConcept("Hb", 12)
                .build();
            decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
            assert.notInclude(C.findValue(decisions.encounterDecisions, "Refer to the hospital immediately for"), "Abnormal Hb");
        });

        it(`is generated for high Blood Sugar (>= 140mg/dl)`, () => {
            let ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                .forConcept("Blood Sugar", 140)
                .build();
            decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
            assert.include(C.findValue(decisions.encounterDecisions, "Refer to the hospital immediately for"), "High blood sugar");

            ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                .forConcept("Blood Sugar", 139)
                .build();
            decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
            assert.notInclude(C.findValue(decisions.encounterDecisions, "Refer to the hospital immediately for"), "High blood sugar");
        });

        it(`is generated for SS Hb Electrophoresis`, () => {
            let ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                .forSingleCoded("Hb Electrophoresis", "SS")
                .build();
            decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
            assert.include(C.findValue(decisions.encounterDecisions, "Refer to the hospital immediately for"), "Abnormal Hb Electrophoresis");

            ["AS", "AA"].forEach((r) => {
                ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                    .forSingleCoded("Hb Electrophoresis", r)
                    .build();
                decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
                assert.notInclude(C.findValue(decisions.encounterDecisions, "Refer to the hospital immediately for"), "Abnormal Hb Electrophoresis");
            });
        });

        it("is advised if Urine Albumin is Trace or more", () => {
            ["Trace", "+1", "+2", "+3", "+4"].forEach((result) => {
                let ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                    .forSingleCoded("Urine Albumin", result)
                    .build();
                decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
                assert.include(C.findValue(decisions.encounterDecisions, "Refer to the hospital immediately for"), "Abnormal Urine Albumin");
            });
        });

        it("is advised if Urine Sugar is Trace or more", () => {
            ["Trace", "+1", "+2", "+3", "+4"].forEach((result) => {
                let ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                    .forSingleCoded("Urine Sugar", result)
                    .build();
                decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
                assert.include(C.findValue(decisions.encounterDecisions, "Refer to the hospital immediately for"), "Abnormal Urine Sugar");
            });
        });
    });

    describe("High Risk Condition", () => {

        ["Excessive vomiting and inability to consume anything orally", "Severe Abdominal Pain", "Blurred vision",
            "Decreased Foetal movements", "Per vaginal bleeding", "PV leaking", "Morning Sickness", "Difficulty breathing", "Severe headache"]
            .forEach((complication) => {
                it(`is added if mother has ${complication}`, () => {
                    let ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                        .forMultiCoded("Pregnancy complications", [complication])
                        .build();
                    decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
                    assert.include(C.findValue(decisions.encounterDecisions, "High Risk Conditions"), complication);
                });
            });


        it("is added in case of presence of Pedal Edema", () => {
            let ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                .forSingleCoded("Pedal Edema", "Present")
                .build();
            decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
            assert.include(C.findValue(decisions.encounterDecisions, "High Risk Conditions"), "Pedal Edema Present");
        });

        it("is added in case of presence of Pallor", () => {
            let ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                .forSingleCoded("Pallor", "Present")
                .build();
            decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
            assert.include(C.findValue(decisions.encounterDecisions, "High Risk Conditions"), "Pallor Present");
        });

        it("is generated if mother gains more than 2 KGs in 4 weeks", () => {
            const lmp = refDate.subtract(32, "w").toDate();
            const encounter1DateTime = moment(lmp).add(14, "w").toDate();
            const encounter2DateTime = moment(lmp).add(18, "w").toDate();
            enrolment = new EnrolmentFiller(programData, individual, lmp)
                .forConcept("Last menstrual period", lmp)
                .build();
            let anc1Encounter = new EncounterFiller(programData, enrolment, "ANC", encounter1DateTime)
                .forConcept("Weight", 55)
                .build();
            let anc2Encounter = new EncounterFiller(programData, enrolment, "ANC", encounter2DateTime)
                .forConcept("Weight", 55 + 3)
                .build();
            enrolment.encounters = [anc1Encounter, anc2Encounter];
            decisions = motherEncounterDecision.getDecisions(anc2Encounter, encounter2DateTime);
            assert.include(C.findValue(decisions.encounterDecisions, "High Risk Conditions"), "Irregular weight gain");
        });

        it("is generated if mother gains less than 1.7 KGs in 4 weeks", () => {
            const lmp = refDate.subtract(32, "w").toDate();
            const encounter1DateTime = moment(lmp).add(14, "w").toDate();
            const encounter2DateTime = moment(lmp).add(18, "w").toDate();
            enrolment = new EnrolmentFiller(programData, individual, lmp)
                .forConcept("Last menstrual period", lmp)
                .build();
            let anc1Encounter = new EncounterFiller(programData, enrolment, "ANC", encounter1DateTime)
                .forConcept("Weight", 55)
                .build();
            let anc2Encounter = new EncounterFiller(programData, enrolment, "ANC", encounter2DateTime)
                .forConcept("Weight", 55 + 1.5)
                .build();
            enrolment.encounters = [anc1Encounter, anc2Encounter];
            decisions = motherEncounterDecision.getDecisions(anc2Encounter, encounter2DateTime);
            assert.include(C.findValue(decisions.encounterDecisions, "High Risk Conditions"), "Irregular weight gain");
        });

        it("is not generated if mother gains between 1.7...2 KGs in 4 weeks", () => {
            const lmp = refDate.subtract(32, "w").toDate();
            const encounter1DateTime = moment(lmp).add(14, "w").toDate();
            const encounter2DateTime = moment(lmp).add(18, "w").toDate();
            enrolment = new EnrolmentFiller(programData, individual, lmp)
                .forConcept("Last menstrual period", lmp)
                .build();
            let anc1Encounter = new EncounterFiller(programData, enrolment, "ANC", encounter1DateTime)
                .forConcept("Weight", 55)
                .build();
            let anc2Encounter = new EncounterFiller(programData, enrolment, "ANC", encounter2DateTime)
                .forConcept("Weight", 55 + 1.8)
                .build();
            enrolment.encounters = [anc1Encounter, anc2Encounter];
            decisions = motherEncounterDecision.getDecisions(anc2Encounter, encounter2DateTime);
            assert.notInclude(C.findValue(decisions.encounterDecisions, "High Risk Conditions"), "Irregular weight gain");
        });

        ["Flat", "Retracted"].forEach((nippleState) => {
            it(`is added if mother has ${nippleState} nipples`, () => {
                let ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                    .forSingleCoded("Breast Examination - Nipple", nippleState)
                    .build();
                decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
                assert.include(C.findValue(decisions.encounterDecisions, "High Risk Conditions"), `${nippleState} Nipples`);
            });
        });

        it("is added if fundal height from pubic symphysis increase is more than 1 cm per week", () => {
            const lmp = moment().subtract(28, "w").toDate();
            const encounter1DateTime = moment().subtract(3, "w").toDate();
            enrolment = new EnrolmentFiller(programData, individual, lmp)
                .forConcept("Last menstrual period", lmp)
                .build();
            let anc1Encounter = new EncounterFiller(programData, enrolment, "ANC", encounter1DateTime)
                .forConcept("Fundal height from pubic symphysis", 500)
                .build();
            let anc2Encounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                .forConcept("Fundal height from pubic symphysis", 506)
                .build();
            enrolment.encounters = [anc1Encounter, anc2Encounter];
            decisions = motherEncounterDecision.getDecisions(anc2Encounter, new Date());
            assert.include(C.findValue(decisions.encounterDecisions, "High Risk Conditions"), "Irregular fundal height increase");
        });

        it("is added if fundal height from pubic symphysis increase is less than 1 cm per week", () => {
            const lmp = moment().subtract(28, "w").toDate();
            const encounter1DateTime = moment().subtract(3, "w").toDate();
            enrolment = new EnrolmentFiller(programData, individual, lmp)
                .forConcept("Last menstrual period", lmp)
                .build();
            let anc1Encounter = new EncounterFiller(programData, enrolment, "ANC", encounter1DateTime)
                .forConcept("Fundal height from pubic symphysis", 500)
                .build();
            let anc2Encounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                .forConcept("Fundal height from pubic symphysis", 502)
                .build();
            enrolment.encounters = [anc1Encounter, anc2Encounter];
            decisions = motherEncounterDecision.getDecisions(anc2Encounter, new Date());
            assert.include(C.findValue(decisions.encounterDecisions, "High Risk Conditions"), "Irregular fundal height increase");
        });

        it("is not added if fundal height from pubic symphysis increase is 1 cm per week", () => {
            const lmp = moment().subtract(28, "w").toDate();
            const encounter1DateTime = moment().subtract(3, "w").toDate();
            enrolment = new EnrolmentFiller(programData, individual, lmp)
                .forConcept("Last menstrual period", lmp)
                .build();
            let anc1Encounter = new EncounterFiller(programData, enrolment, "ANC", encounter1DateTime)
                .forConcept("Fundal height from pubic symphysis", 500)
                .build();
            let anc2Encounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                .forConcept("Fundal height from pubic symphysis", 503)
                .build();
            enrolment.encounters = [anc1Encounter, anc2Encounter];
            decisions = motherEncounterDecision.getDecisions(anc2Encounter, new Date());
            assert.isEmpty(C.findValue(decisions.encounterDecisions, "High Risk Conditions"));
        });

        it("is added if abdominal girth is more than 2.5 cm per week", () => {
            const lmp = moment().subtract(35, "w").toDate();
            const encounter1DateTime = moment().subtract(3, "w").toDate();
            enrolment = new EnrolmentFiller(programData, individual, lmp)
                .forConcept("Last menstrual period", lmp)
                .build();
            let anc1Encounter = new EncounterFiller(programData, enrolment, "ANC", encounter1DateTime)
                .forConcept("Abdominal girth", 500)
                .build();
            let anc2Encounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                .forConcept("Abdominal girth", 509)
                .build();
            enrolment.encounters = [anc1Encounter, anc2Encounter];
            decisions = motherEncounterDecision.getDecisions(anc2Encounter, new Date());
            assert.include(C.findValue(decisions.encounterDecisions, "High Risk Conditions"), "Irregular abdominal girth increase");
        });

        it("is added if abdominal girth increase is less than 2.5 cm per week", () => {
            const lmp = moment().subtract(35, "w").toDate();
            const encounter1DateTime = moment().subtract(3, "w").toDate();
            enrolment = new EnrolmentFiller(programData, individual, lmp)
                .forConcept("Last menstrual period", lmp)
                .build();
            let anc1Encounter = new EncounterFiller(programData, enrolment, "ANC", encounter1DateTime)
                .forConcept("Abdominal girth", 500)
                .build();
            let anc2Encounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                .forConcept("Abdominal girth", 501)
                .build();
            enrolment.encounters = [anc1Encounter, anc2Encounter];
            decisions = motherEncounterDecision.getDecisions(anc2Encounter, new Date());
            assert.include(C.findValue(decisions.encounterDecisions, "High Risk Conditions"), "Irregular abdominal girth increase");
        });

        it("is not added if abdominal girth increase is 2.5 cm per week", () => {
            const lmp = moment().subtract(35, "w").toDate();
            const encounter1DateTime = moment().subtract(3, "w").toDate();
            enrolment = new EnrolmentFiller(programData, individual, lmp)
                .forConcept("Last menstrual period", lmp)
                .build();
            let anc1Encounter = new EncounterFiller(programData, enrolment, "ANC", encounter1DateTime)
                .forConcept("Abdominal girth", 500)
                .build();
            let anc2Encounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                .forConcept("Abdominal girth", 507.5)
                .build();
            enrolment.encounters = [anc1Encounter, anc2Encounter];
            decisions = motherEncounterDecision.getDecisions(anc2Encounter, new Date());
            assert.isEmpty(C.findValue(decisions.encounterDecisions, "High Risk Conditions"));
        });

        it("is generated if foetal heart sound is irregular or absent", () => {
            let ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                .forSingleCoded("Foetal Heart Sound", "Present and Irregular")
                .build();
            decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
            assert.include(C.findValue(decisions.encounterDecisions, "High Risk Conditions"), "Foetal heart sound irregular");

            ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                .forSingleCoded("Foetal Heart Sound", "Absent")
                .build();
            decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
            assert.include(C.findValue(decisions.encounterDecisions, "High Risk Conditions"), "Foetal heart sound absent");
        });

        it("is generated if foetal heart heart rate is less than 120 or greater than 160", () => {
            let ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                .forConcept("Foetal Heart Rate", 119)
                .build();
            decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
            assert.include(C.findValue(decisions.encounterDecisions, "High Risk Conditions"), "Foetal heart rate irregular");

            ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                .forConcept("Foetal Heart Rate", 161)
                .build();
            decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
            assert.include(C.findValue(decisions.encounterDecisions, "High Risk Conditions"), "Foetal heart rate irregular");
        });

        it("is not generated if foetal heart heart rate is between 120 and 160", () => {
            let ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                .forConcept("Foetal Heart Rate", 121)
                .build();
            decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
            assert.isEmpty(C.findValue(decisions.encounterDecisions, "High Risk Conditions"));
        });

        it("is generated if pulse is abnormal (<60 or >100)", () => {
            let ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                .forConcept("Pulse", 59)
                .build();
            decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
            assert.include(C.findValue(decisions.encounterDecisions, "High Risk Conditions"), "Irregular pulse");

            ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                .forConcept("Pulse", 101)
                .build();
            decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
            assert.include(C.findValue(decisions.encounterDecisions, "High Risk Conditions"), "Irregular pulse");

        });

        it("is generated if RR is abnormal (<12 or >20)", () => {
            let ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                .forConcept("Respiratory Rate", 11)
                .build();
            decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
            assert.include(C.findValue(decisions.encounterDecisions, "High Risk Conditions"), "Irregular Respiratory Rate");

            ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                .forConcept("Respiratory Rate", 21)
                .build();
            decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
            assert.include(C.findValue(decisions.encounterDecisions, "High Risk Conditions"), "Irregular Respiratory Rate");

        });

        it("is generated if Blood Sugar is abnormal (>=140)", () => {
            let ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                .forConcept("Blood Sugar", 141)
                .build();
            decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
            assert.include(C.findValue(decisions.encounterDecisions, "High Risk Conditions"), "High blood sugar");
        });

        it("is generated if Urine Sugar is Trace or more", () => {
            ["Trace", "+1", "+2", "+3", "+4"].forEach((result) => {
                let ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                    .forSingleCoded("Urine Sugar", result)
                    .build();
                decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
                assert.include(C.findValue(decisions.encounterDecisions, "High Risk Conditions"), "Abnormal Urine Sugar");
            });
        });

        it("is generated if more than 1 foetus", () => {
            ["Two", "Three", "More than three"].forEach((result) => {
                let ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                    .forSingleCoded("USG Scanning Report - Number of foetus", result)
                    .build();
                decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
                assert.include(C.findValue(decisions.encounterDecisions, "High Risk Conditions"), "Multiple foetuses");
            });
        });

        it("is generated if more liquour increased or decreased", () => {
            ["Increased", "Decreased"].forEach((result) => {
                let ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                    .forSingleCoded("USG Scanning Report - Liquour", result)
                    .build();
                decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
                assert.include(C.findValue(decisions.encounterDecisions, "High Risk Conditions"), "Abnormal Liquour");
            });
        });

        it("is generated if placenta previa", () => {
            let ancEncounter = new EncounterFiller(programData, enrolment, "ANC", new Date())
                .forSingleCoded("USG Scanning Report - Placenta Previa", "Previa")
                .build();
            decisions = motherEncounterDecision.getDecisions(ancEncounter, new Date());
            assert.include(C.findValue(decisions.encounterDecisions, "High Risk Conditions"), "Placenta Previa Present");
        });

        it("is not generated if mother has respiratory rate <30 or >60 bpm", () => {
            const lmp = moment().subtract(25, "w").toDate();
            const encounter1DateTime = moment().subtract(4, "w").toDate();
            enrolment = new EnrolmentFiller(programData, individual, lmp)
                .forConcept("Last menstrual period", lmp)
                .build();
            let anc1Encounter = new EncounterFiller(programData, enrolment, "ANC", encounter1DateTime)
                .forConcept("Respiratory Rate", 105)
                .forConcept("Child Respiratory Rate", 105)
                .build();
            enrolment.encounters = [anc1Encounter];
            decisions = motherEncounterDecision.getDecisions(anc1Encounter, new Date());
            assert.notInclude(C.findValue(decisions.encounterDecisions, "Refer to the hospital for"), "Respiratory Rate <30 or > 60 bpm");
        });

    });
});