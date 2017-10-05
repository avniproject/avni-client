var expect = require('chai').expect;
var decision = require('../health_modules/encounterDecision');
var {Encounter, Form} = require('./Entities');

describe('Make Decision', function () {
    it('Regression for all diseases, to ensure there are no exceptions and error messages', function () {
        Object.keys(decision.treatmentByComplaintAndCode).forEach(function (complaint) {
            decision.weightRangesToCode.forEach(function (weightRangeToCode) {
                ["Male", "Female"].forEach(function (gender) {
                    var encounter = new Encounter('Outpatient');
                    encounter.setObservation("Complaint", [complaint]);
                    encounter.setObservation("Weight", weightRangeToCode.start);
                    encounter.setGender(gender);
                    encounter.setAge(10);
                    console.log("##### {complaint}, {weightRangeToCode.start}, {gender} ######".replace("{complaint}", complaint).replace("{weightRangeToCode.start}", weightRangeToCode.start).replace("{gender}", gender));
                    if (decision.validate(encounter, new Form()).success) {
                        const decisions = decision.getDecisions(encounter);
                        expect(decisions.length).to.equal(1);
                        expect(decisions[0].value.includes("undefined")).to.equal(false, decisions[0].value);
                    }
                });
            });
        });
    });

    it('Validate', function () {
        var complaintConceptName = "Complaint";
        var validationResults = decision.validate(new Encounter('Outpatient').setObservation(complaintConceptName, ["Pregnancy"]).setObservation("Weight", 40).setGender("Male").setAge(25), new Form());
        expect(validationResults[0].success).to.equal(false, validationResults[0].message);

        validationResults = decision.validate(new Encounter('Outpatient').setObservation(complaintConceptName, ["Pregnancy"]).setAge(5).setGender("Female").setObservation("Weight", 40), new Form());
        expect(validationResults[0].success).to.equal(false, validationResults[0].message);

        validationResults = decision.validate(new Encounter('Outpatient').setObservation(complaintConceptName, ["Pregnancy"]).setAge(3).setGender("Female").setObservation("Weight", 40), new Form());
        expect(validationResults[0].success).to.equal(false, validationResults[0].message);

        validationResults = decision.validate(new Encounter('Outpatient').setObservation(complaintConceptName, ["Pregnancy"]).setAge(12).setGender("Female").setObservation("Weight", 40), new Form());
        expect(validationResults.length).to.equal(0, validationResults);

        validationResults = decision.validate(new Encounter('Outpatient').setObservation(complaintConceptName, ["Chloroquine Resistant Malaria"]).setObservation("Weight", 3).setGender("Male"), new Form());
        expect(validationResults[0].success).to.equal(false, validationResults[0].message);
    });

    it('Complaint which allows for prescription', function () {
        var decisions = decision.getDecisions(new Encounter('Outpatient').setObservation("Complaint", ["Cold"]).setGender("Male").setAge(25).setObservation("Weight", 40)).encounterDecisions;
        expect(decisions[0].value).to.not.equal(undefined);
        expect(decisions[0].abnormal).to.be.falsy;
    });

    it('Do not give any medicine for chloroquin resistant malaria to women between 16-40', function () {
        var decisions = decision.getDecisions(new Encounter('Outpatient').setObservation("Complaint", ["Chloroquine Resistant Malaria"]).setGender("Female").setAge(25).setObservation("Weight", 40)).encounterDecisions;
        expect(decisions[0].value).to.equal("");
        expect(decisions[0].abnormal).to.be.truthy;
    });

    it('Provide day wise instructions when specified for days separately', function () {
        var decisions = decision.getDecisions(new Encounter('Outpatient').setObservation("Complaint", ["Fever"]).setObservation("Paracheck", ["Positive for PF"]).setGender("Male").setAge(25).setObservation("Weight", 40)).encounterDecisions;
        var chloroquinCount = (decisions[0].value.match(/क्लोरोक्विन/g) || []).length;
        expect(chloroquinCount).to.equal(3, decisions[0].value);
        var pcmCount = (decisions[0].value.match(/पॅरासिटामॉल/g) || []).length;
        expect(pcmCount).to.equal(3, decisions[0].value);
    });

    it('Do not provide day wise instructions when not specified for days separately', function () {
        var decisions = decision.getDecisions(new Encounter('Outpatient').setObservation("Complaint", ["Cough"]).setGender("Male").setAge(25).setObservation("Weight", 40)).encounterDecisions;
        var medicineCount = (decisions[0].value.match(/सेप्ट्रान/g) || []).length;
        expect(medicineCount).to.equal(1, decisions[0].value);
        expect((decisions[0].value.match(/पहिल्या दिवशी/g) || []).length).to.equal(0, decisions[0].value);
    });

    it('Print special instruction', function () {
        var decisions = decision.getDecisions(new Encounter('Outpatient').setObservation("Complaint", ["Ring Worm"]).setGender("Male").setAge(25).setObservation("Weight", 40)).encounterDecisions;
        var count = (decisions[0].value.match(/गजकर्णाच्या जागेवर लावण्यास सांगावे/g) || []).length;
        expect(count).to.equal(1, decisions[0].value);
        expect((decisions[0].value.match(/पहिल्या दिवशी/g) || []).length).to.equal(0, decisions[0].value);
    });

    it('In cough do not give Septran to potentially pregnant women', function () {
        var decisions = decision.getDecisions(new Encounter('Outpatient').setObservation("Complaint", ["Cough"]).setGender("Male").setAge(25).setObservation("Weight", 40)).encounterDecisions;
        expect((decisions[0].value.match(/सिफ्रान/g) || []).length).to.equal(0, decisions[0].value);
        expect((decisions[0].value.match(/सेप्ट्रान/g) || []).length).to.equal(1, decisions[0].value);

        decisions = decision.getDecisions(new Encounter('Outpatient').setObservation("Complaint", ["Cough"]).setGender("Female").setAge(25).setObservation("Weight", 40)).encounterDecisions;
        expect((decisions[0].value.match(/सिफ्रान/g) || []).length).to.equal(1, decisions[0].value);
        expect((decisions[0].value.match(/सेप्ट्रान/g) || []).length).to.equal(0, decisions[0].value);

        decisions = decision.getDecisions(new Encounter('Outpatient').setObservation("Complaint", ["Cough"]).setGender("Female").setAge(45).setObservation("Weight", 40)).encounterDecisions;
        expect((decisions[0].value.match(/सिफ्रान/g) || []).length).to.equal(0, decisions[0].value);
        expect((decisions[0].value.match(/सेप्ट्रान/g) || []).length).to.equal(1, decisions[0].value);

        decisions = decision.getDecisions(new Encounter('Outpatient').setObservation("Complaint", ["Boils"]).setGender("Female").setAge(25).setObservation("Weight", 40)).encounterDecisions;
        expect((decisions[0].value.match(/सिफ्रान/g) || []).length).to.equal(1, decisions[0].value);
        expect((decisions[0].value.match(/सेप्ट्रान/g) || []).length).to.equal(0, decisions[0].value);

        decisions = decision.getDecisions(new Encounter('Outpatient').setObservation("Complaint", ["Wound"]).setGender("Female").setAge(25).setObservation("Weight", 40)).encounterDecisions;
        expect((decisions[0].value.match(/सिफ्रान/g) || []).length).to.equal(1, decisions[0].value);
        expect((decisions[0].value.match(/सेप्ट्रान/g) || []).length).to.equal(0, decisions[0].value);
    });

    it('Before food and after food instruction', function () {
        var decisions = decision.getDecisions(new Encounter('Outpatient').setObservation("Complaint", ["Cold"]).setGender("Male").setAge(25).setObservation("Weight", 40)).encounterDecisions;
        expect((decisions[0].value.match(/जेवणाआधी/g) || []).length).to.equal(0, decisions[0].value);

        decisions = decision.getDecisions(new Encounter('Outpatient').setObservation("Complaint", ["Acidity"]).setGender("Male").setAge(25).setObservation("Weight", 40)).encounterDecisions;
        expect((decisions[0].value.match(/जेवणाआधी/g) || []).length).to.equal(1, decisions[0].value);
    });

    it('Multiple complaints without same medicines', function () {
        const decisions = decision.getDecisions(new Encounter('Outpatient').setObservation("Complaint", ["Cold", "Body Ache"]).setGender("Male").setAge(25).setObservation("Weight", 40)).encounterDecisions;
        const completeValue = decisions[0].value + decisions[1].value;
        expect((completeValue.match(/सेट्रीझीन/g) || []).length).to.equal(1, completeValue);
        expect((completeValue.match(/पॅरासिटामॉल/g) || []).length).to.equal(1, completeValue);
    });

    it('Multiple complaints with overlapping medicines', function () {
        var decisions = decision.getDecisions(new Encounter('Outpatient').setObservation("Complaint", ["Cold", "Fever", "Body Ache"]).setGender("Male").setAge(25).setObservation("Weight", 40)).encounterDecisions;
        var completeValue = decisions[0].value + decisions[1].value + decisions[2].value;
        expect((completeValue.match(/सेट्रीझीन/g) || []).length).to.equal(1, completeValue);
        expect((completeValue.match(/पॅरासिटामॉल/g) || []).length).to.equal(1, completeValue);
    });

    it('Multiple complaints with overlapping medicines and different order of medicines', function () {
        var decisions = decision.getDecisions(new Encounter('Outpatient').setObservation("Complaint", ["Cold", "Body Ache", "Fever"]).setObservation("Paracheck", ["Positive for PF and PV"]).setGender("Male").setAge(25).setObservation("Weight", 40)).encounterDecisions;
        var message = completeValue(decisions);
        expect((message.match(/क्लोरोक्विन/g) || []).length).to.equal(3, message);
        expect((message.match(/सेट्रीझीन/g) || []).length).to.equal(1, message);
        expect((message.match(/पॅरासिटामॉल/g) || []).length).to.equal(3, message);
    });

    it('Pick validation errors corresponding to all complaints', function () {
        var complaintConceptName = "Complaint";
        var validationResult = decision.validate(new Encounter('Outpatient').setObservation(complaintConceptName, ["Cold", "Acidity"]).setGender("Male").setAge(5).setObservation("Weight", 12), new Form())[0];
        expect(validationResult.success).to.equal(false, validationResult.message);
    });

    it('Multiple complaints and passing all validations', function () {
        const complaintConceptName = "Complaint";
        const validationResults = decision.validate(new Encounter('Outpatient').setObservation(complaintConceptName, ["Cold", "Acidity"]).setGender("Male").setAge(10).setObservation("Weight", 22), new Form());
        expect(validationResults.length).to.equal(0, validationResults.message);
    });

    it('Alert should be only for the decision for the complaint', () => {
        var complaintConceptName = "Complaint";
        var decisions = decision.getDecisions(new Encounter('Outpatient').setObservation(complaintConceptName, ["Cold", "Vomiting"]).setGender("Male").setAge(10).setObservation("Weight", 22)).encounterDecisions;
        expect(decisions[0].abnormal).to.be.falsy;
        expect((decisions[1].value.match(/उलटी असल्यास/g) || []).length).to.equal(1);
        expect(decisions[1].abnormal).to.be.truthy;
    });

    it('Boundary condition of weight', () => {
        var complaintConceptName = "Complaint";
        var decisions = decision.getDecisions(new Encounter('Outpatient').setObservation(complaintConceptName, ["Fever"]).setGender("Male").setAge(10).setObservation("Weight", 5.5).setObservation("Paracheck", ["Positive PV"])).encounterDecisions;
        expect(decisions.length).to.equal(1);
    });

    it('Give malaria medicine based on paracheck being positive', () => {
        var complaintConceptName = "Complaint";
        var decisions = decision.getDecisions(new Encounter('Outpatient').setObservation(complaintConceptName, ["Cold"]).setGender("Male").setAge(10).setObservation("Weight", 5.5).setObservation("Paracheck", ["Positive PV"])).encounterDecisions;
        expect((decisions[0].value.match(/क्लोरोक्विन/g) || []).length).to.equal(3, decisions[0].value);
    });

    it('Give malaria medicine based on paracheck being positive - when fever is also specified', () => {
        var complaintConceptName = "Complaint";
        var decisions = decision.getDecisions(new Encounter('Outpatient').setObservation(complaintConceptName, ["Cold", "Fever"]).setGender("Male").setAge(10).setObservation("Weight", 8).setObservation("Paracheck", ["Positive PV"])).encounterDecisions;
        expect((decisions[0].value.match(/क्लोरोक्विन/g) || []).length).to.equal(3, decisions[0].value);
    });
    
    it('Fever, Body Ache & Vomiting', () => {
        var complaintConceptName = "Complaint";
        var decisions = decision.getDecisions(new Encounter('Outpatient').setObservation(complaintConceptName, ["Fever", "Body Ache", "Vomiting"]).setGender("Male").setAge(20).setObservation("Weight", 18)).encounterDecisions;
        var message = completeValue(decisions);
        expect((message.match(/पॅरासिटामॉल/g) || []).length).to.equal(1, message);
        expect((message.match(/३ दिवस/g) || []).length).to.equal(3, message);
    });

    var completeValue = function (decisions) {
        var message = "";
        for (var i = 0; i < decisions.length; i++)
            message+= decisions[i].value;
        return message;
    }
});