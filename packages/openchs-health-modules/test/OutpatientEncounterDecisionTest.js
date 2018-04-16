var assert = require('chai').assert;
var decision = require('../health_modules/outpatient/encounterDecision');
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
                    //console.log("##### {complaint}, {weightRangeToCode.start}, {gender} ######".replace("{complaint}", complaint).replace("{weightRangeToCode.start}", weightRangeToCode.start).replace("{gender}", gender));
                    if (decision.validate(encounter, new Form()).success) {
                        const decisions = decision.getDecisions(encounter);
                        expect(decisions.length, 1);
                        expect(decisions[0].value.includes("undefined"), false, decisions[0].value);
                    }
                });
            });
        });
    });

    it('Validate', function () {
        var complaintConceptName = "Complaint";
        var validationResults = decision.validate(new Encounter('Outpatient').setObservation(complaintConceptName, ["Pregnancy"]).setObservation("Weight", 40).setGender("Male").setAge(25), new Form());
        assert.equal(validationResults[0].success, false, validationResults[0].message);

        validationResults = decision.validate(new Encounter('Outpatient').setObservation(complaintConceptName, ["Pregnancy"]).setAge(5).setGender("Female").setObservation("Weight", 40), new Form());
        assert.equal(validationResults[0].success, false, validationResults[0].message);

        validationResults = decision.validate(new Encounter('Outpatient').setObservation(complaintConceptName, ["Pregnancy"]).setAge(3).setGender("Female").setObservation("Weight", 40), new Form());
        assert.equal(validationResults[0].success, false, validationResults[0].message);

        validationResults = decision.validate(new Encounter('Outpatient').setObservation(complaintConceptName, ["Pregnancy"]).setAge(12).setGender("Female").setObservation("Weight", 40), new Form());
        assert.equal(validationResults.length, 0, validationResults);

        validationResults = decision.validate(new Encounter('Outpatient').setObservation(complaintConceptName, ["Acidity"]).setObservation("Weight", 3).setGender("Male"), new Form());
        assert.equal(validationResults[0].success, false, validationResults[0].message);
    });

    it('Complaint which allows for prescription', function () {
        var decisions = decision.getDecisions(new Encounter('Outpatient').setObservation("Complaint", ["Cold"]).setGender("Male").setAge(25).setObservation("Weight", 40)).encounterDecisions;
        assert.isDefined(decisions[0].value);
        assert.isOk(decisions[0].abnormal);
    });

    it('Do not give any medicine for chloroquin resistant malaria to women between 16-40', function () {
        var decisions = decision.getDecisions(new Encounter('Outpatient').setObservation("Complaint", ["Chloroquine Resistant Malaria"]).setGender("Female").setAge(25).setObservation("Weight", 40)).encounterDecisions;
        let treatmentDecision = getDecisionByName(decisions, 'Treatment Advice');
        assert.equal(treatmentDecision.value, '');
    });

    it('Do not provide day wise instructions when not specified for days separately', function () {
        var decisions = decision.getDecisions(new Encounter('Outpatient').setObservation("Complaint", ["Cough"]).setGender("Male").setAge(25).setObservation("Weight", 40)).encounterDecisions;
        var medicineCount = (decisions[0].value.match(/सेप्ट्रान/g) || []).length;
        assert.equal(medicineCount, 1, decisions[0].value);
        assert.equal((decisions[0].value.match(/पहिल्या दिवशी/g) || []).length, 0, decisions[0].value);
    });

    it('Print special instruction', function () {
        var decisions = decision.getDecisions(new Encounter('Outpatient').setObservation("Complaint", ["Ring Worm"]).setGender("Male").setAge(25).setObservation("Weight", 40)).encounterDecisions;
        var count = (decisions[0].value.match(/गजकर्णाच्या जागेवर लावण्यास सांगावे/g) || []).length;
        assert.equal(count, 1, decisions[0].value);
        assert.equal((decisions[0].value.match(/पहिल्या दिवशी/g) || []).length, 0, decisions[0].value);
    });

    it('Before food and after food instruction', function () {
        var decisions = decision.getDecisions(new Encounter('Outpatient').setObservation("Complaint", ["Cold"]).setGender("Male").setAge(25).setObservation("Weight", 40)).encounterDecisions;
        assert.equal((decisions[0].value.match(/जेवणाआधी/g) || []).length, 0, decisions[0].value);

        decisions = decision.getDecisions(new Encounter('Outpatient').setObservation("Complaint", ["Acidity"]).setGender("Male").setAge(25).setObservation("Weight", 40)).encounterDecisions;
        assert.equal((decisions[0].value.match(/जेवणाआधी/g) || []).length, 1, decisions[0].value);
    });

    it('Multiple complaints without same medicines', function () {
        const decisions = decision.getDecisions(new Encounter('Outpatient').setObservation("Complaint", ["Cold", "Body Ache"]).setGender("Male").setAge(25).setObservation("Weight", 40)).encounterDecisions;
        const completeValue = decisions[0].value;
        assert.equal((completeValue.match(/सेट्रीझीन/g) || []).length, 1, completeValue);
        assert.equal((completeValue.match(/पॅरासिटामॉल/g) || []).length, 1, completeValue);
    });

    it('Multiple complaints with overlapping medicines', function () {
        var decisions = decision.getDecisions(new Encounter('Outpatient').setObservation("Complaint", ["Cold", "Body Ache"]).setGender("Male").setAge(25).setObservation("Weight", 40)).encounterDecisions;
        var completeValue = decisions[0].value;
        assert.equal((completeValue.match(/सेट्रीझीन/g) || []).length, 1, completeValue);
    });

    it('Multiple complaints with overlapping medicines and different order of medicines', function () {
        var decisions = decision.getDecisions(new Encounter('Outpatient').setObservation("Complaint", ["Cold", "Body Ache", "Ring Worm"]).setGender("Male").setAge(25).setObservation("Weight", 40)).encounterDecisions;
        var message = completeValue(decisions);
        assert.equal((message.match(/सेट्रीझीन/g) || []).length, 1, message);
        assert.equal((message.match(/सॅलिसिलिक ऍसिड/g) || []).length, 1, message);
    });

    it('Pick validation errors corresponding to all complaints', function () {
        var complaintConceptName = "Complaint";
        var validationResult = decision.validate(new Encounter('Outpatient').setObservation(complaintConceptName, ["Cold", "Acidity"]).setGender("Male").setAge(5).setObservation("Weight", 12), new Form())[0];
        assert.equal(validationResult.success, false, validationResult.message);
    });

    it('Multiple complaints and passing all validations', function () {
        const complaintConceptName = "Complaint";
        const validationResults = decision.validate(new Encounter('Outpatient').setObservation(complaintConceptName, ["Cold", "Acidity"]).setGender("Male").setAge(10).setObservation("Weight", 22), new Form());
        assert.equal(validationResults.length, 0, validationResults.message);
    });

    it('Boundary condition of weight', () => {
        var complaintConceptName = "Complaint";
        var decisions = decision.getDecisions(new Encounter('Outpatient').setObservation(complaintConceptName, ["Fever"]).setGender("Male").setAge(10).setObservation("Weight", 5.5).setObservation("Paracheck", ["Positive PV"])).encounterDecisions;
        assert.isNotEmpty(decisions.find(decision => decision.name === 'Treatment Advice').value); 
    });

    it('Fever, Body Ache & Vomiting', () => {
        var complaintConceptName = "Complaint";
        var decisions = decision.getDecisions(new Encounter('Outpatient').setObservation(complaintConceptName, ["Fever", "Body Ache", "Vomiting"]).setGender("Male").setAge(20).setObservation("Weight", 18)).encounterDecisions;
        var message = completeValue(decisions);
        assert.equal((message.match(/पॅरासिटामॉल/g) || []).length, 2, message);
        assert.equal((message.match(/३ दिवस/g) || []).length, 1, message);
    });

    it("Shouldn't generate treatment advice if complaint is other", () => {
        var complaintConceptName = "Complaint";
        var decisions = decision.getDecisions(new Encounter('Outpatient').setObservation(complaintConceptName, ["Other"]).setGender("Male").setAge(20).setObservation("Weight", 18)).encounterDecisions;
        let treatmentDecision = getDecisionByName(decisions, 'Treatment Advice');
        assert.equal(treatmentDecision.value, '');
    });

    let defaultEncounter = (complaints, weight=40) => new Encounter('Outpatient').setObservation("Complaint", complaints).setObservation("Weight", weight);
    let defaultMaleEncounter = (complaints, weight) => defaultEncounter(complaints, weight).setGender("Male").setAge(25);
    let defaultFemaleEncounter = (complaints, weight) => defaultEncounter(complaints, weight).setGender("Female").setAge(25);

    var verifyPrescription = (encounter, assertionFn) => {
        let decisions = decision.getDecisions(encounter).encounterDecisions;
        let message = completeValue(decisions);
        assertionFn(decisions, message);
    };

    var verifyPrescriptionForComplaints = (complaints, assertionFn, nonDefaultEncounter) => {
        if (!nonDefaultEncounter) {
            verifyPrescription(defaultMaleEncounter(complaints), assertionFn);
            verifyPrescription(defaultFemaleEncounter(complaints), assertionFn);
        }
        else {
            verifyPrescription(nonDefaultEncounter, assertionFn);
        }
    }

    var paracetamolFor3Days = (complaints, nonDefaultEncounter) => {
        verifyPrescriptionForComplaints(complaints, (decisions,message) => {
            assert.equal((message.match(/३ दिवस\nपॅरासिटामॉल/g) || []).length, 1, message);
        }, nonDefaultEncounter);
    }

    var treatmentAdviceIsEmpty = (complaints, nonDefaultEncounter) => {
        verifyPrescriptionForComplaints(complaints, (decisions,message) => {
            assert.isEmpty(decisions.find(decision => decision.name === 'Treatment Advice').value); 
        }, nonDefaultEncounter);
    }

    var referralAdviceIsGenerated = (complaints, nonDefaultEncounter) => {
        verifyPrescriptionForComplaints(complaints, (decisions,message) => {
            assert.isNotEmpty(decisions.find(decision => decision.name === 'Referral Advice')); 
            assert.equal((message.match(/लोक बिरादरी दवाखाण्यात पुढील उपचाराकरिता पाठवावे/g) || []).length, 1, message);
        }, nonDefaultEncounter);
    }

    describe("For Headache", () => {
        it("prescribe Paracetamol for 3 days", () => {
            paracetamolFor3Days(["Headache"]);
        });
    });

    describe("For Body Ache", () => {
        it("prescribe Paracetamol for 3 days", () => {
            paracetamolFor3Days(["Body Ache"]);
        });
    });

    describe("For Cold", () => {
        it("prescribe Cetrizine for 3-5 days", () => {
            verifyPrescriptionForComplaints(["Cold"], (decisions,message) => {
                assert.equal((message.match(/३ किंवा ५ दिवसांसाठी\nसेट्रीझीन/g) || []).length, 1, message);
            });
        });
    });

    describe("For Diarrhoea", () => {
        it("prescribe Furoxone, BC and ORS for 3 days", () => {
            verifyPrescriptionForComplaints(["Diarrhoea"], (decisions,message) => {
                assert.equal((message.match(/३ दिवस\nफ्युरोक्सोन/g) || []).length, 1, message);
                assert.equal((message.match(/३ दिवस\nबीसी/g) || []).length, 1, message);
                assert.equal((message.match(/३ दिवस\nORS/g) || []).length, 1, message);
            });
        });
    });

    describe("For Vomiting", () => {
        let complaint = ["Vomiting"];
        let customEncounters = (weight) => [defaultMaleEncounter(complaint, weight), defaultFemaleEncounter(complaint, weight)];

        it("if weight upto 8 kgs, prescribe Ondenestran Syrup and ORS for 3 days", () => {
            let weight = 7;
            customEncounters(weight).map(
                (encounter) =>
                    verifyPrescriptionForComplaints(complaint, (decisions,message) => {
                        assert.equal((message.match(/३ दिवस\nऑन्डेन सायरप/g) || []).length, 1, message);
                        assert.equal((message.match(/३ दिवस\nORS/g) || []).length, 1, message);
                    }, encounter)
            );
        });
        it("if weight between 8 and 16, prescribe Onden Syrup and ORS for 3 days", () => {
            let weight = 12;
            customEncounters(weight).map(
                (encounter) =>
                    verifyPrescriptionForComplaints(complaint, (decisions,message) => {
                        assert.equal((message.match(/३ दिवस\nसायरप ओंडेन/g) || []).length, 1, message);
                        assert.equal((message.match(/३ दिवस\nORS/g) || []).length, 1, message);
                    }, encounter)
            );
        });
        it("if weight more than 16, prescribe Perinorm and ORS for 3 days", () => {
            let weight = 25;
            customEncounters(weight).map(
                (encounter) =>
                    verifyPrescriptionForComplaints(complaint, (decisions,message) => {
                        assert.equal((message.match(/३ दिवस\nपेरीनॉर्म/g) || []).length, 1, message);
                        assert.equal((message.match(/३ दिवस\nORS/g) || []).length, 1, message);
                    }, encounter)
            );
        });
    });

    describe("For Cough or Boils or Wound", function() {
        let complaints = ['Cough', 'Boils', 'Wound'];

        it('Cifran instead of Septran for potentially pregnant women (16-40 years age group)', function () {
            for (let complaint of complaints) { // because we are testing for each complaint separately instead of together
                verifyPrescriptionForComplaints([complaint], (decisions, message) => {
                    assert.equal((decisions[0].value.match(/सिफ्रान/g) || []).length, 1, decisions[0].value);
                    assert.equal((decisions[0].value.match(/सेप्ट्रान/g) || []).length, 0, decisions[0].value);
                }, defaultFemaleEncounter([complaint]))
            }
        });

        it('Cifran instead of Septran for pregnant women regardless of age', function() {
            for (let complaint of complaints) {
                for (let age of [14, 25, 45]) {
                    verifyPrescriptionForComplaints([complaint], (decisions, message) => {
                        assert.equal((decisions[0].value.match(/सिफ्रान/g) || []).length, 1, decisions[0].value);
                        assert.equal((decisions[0].value.match(/सेप्ट्रान/g) || []).length, 0, decisions[0].value);
                    }, defaultFemaleEncounter([complaint]).setObservation("Complaint", [complaint, "Pregnancy"]).setAge(age))
                }
            }
        });

        it('Prescribe Septran for everybody else', function() {
            for (let complaint of complaints) {
                for (let age of [14, 30, 50]) {
                    verifyPrescriptionForComplaints([complaint], (decisions, message) => {
                        assert.equal((decisions[0].value.match(/सिफ्रान/g) || []).length, 0, decisions[0].value);
                        assert.equal((decisions[0].value.match(/सेप्ट्रान/g) || []).length, 1, decisions[0].value);
                    }, defaultMaleEncounter([complaint]).setAge(age))

                    if (age < 16 && age > 40) {
                        verifyPrescriptionForComplaints([complaint], (decisions, message) => {
                            assert.equal((decisions[0].value.match(/सिफ्रान/g) || []).length, 0, decisions[0].value);
                            assert.equal((decisions[0].value.match(/सेप्ट्रान/g) || []).length, 1, decisions[0].value);
                        }, defaultFemaleEncounter([complaint]).setAge(age))
                    }
                }
            }
        });
    });

    describe("For Ring Worm", () => {
        it("prescribe Cetrizine and Salicyclic Acid for 3 days + directions for Salicyclic Acid", () => {
            verifyPrescriptionForComplaints(["Ring Worm"], (decisions,message) => {
                assert.equal((message.match(/३ किंवा ५ दिवसांसाठी\nसेट्रीझीन/g) || []).length, 1, message);
                assert.equal((message.match(/३ किंवा ५ दिवसांसाठी\nसॅलिसिलिक ऍसिड/g) || []).length, 1, message);
                assert.equal((message.match(/गजकर्णाच्या जागेवर लावण्यास सांगावे/g) || []).length, 1, message);
            });
        });
    });

    describe("For Abdominal pain", () => {
        it("prescribe Cyclopam for 2 days", () => {
            verifyPrescriptionForComplaints(["Abdominal pain"], (decisions,message) => {
                assert.equal((message.match(/२ दिवस\nसायक्लोपाम/g) || []).length, 1, message);
            });
        });
    });

    describe("For Acidity", () => {
        it("prescribe Famotidine for 1-5 days", () => {
            verifyPrescriptionForComplaints(["Acidity"], (decisions,message) => {
                assert.equal((message.match(/१ ते ५ दिवस\nफॅमोटिडीन/g) || []).length, 1, message);
            });
        });
    });

    describe("For Scabies", () => {
        it("prescribe Cetrizine and Scabizol for 3 days + directions for Scabizol", () => {
            verifyPrescriptionForComplaints(["Scabies"], (decisions,message) => {
                assert.equal((message.match(/३ दिवस\nसेट्रीझीन/g) || []).length, 1, message);
                assert.equal((message.match(/३ दिवस\nखरुजेचे औषध/g) || []).length, 1, message);
                assert.equal((message.match(/मानेपासून संपूर्ण अंगास अंघोळीनंतर लावणे व कपडे १ तास गरम पाण्यात उकळवीणे/g) || []).length, 1, message);
            });
        });
    });

    describe("For Pregnancy", () => {
        it("prescribe Iron Folic Acid and Calcium", () => {
            let complaint = ["Pregnancy"];
            verifyPrescriptionForComplaints(complaint, (decisions,message) => {
                assert.equal((message.match(/आयरन/g) || []).length, 1, message);
                assert.equal((message.match(/कॅल्शियम/g) || []).length, 1, message);
            }, defaultFemaleEncounter(complaint));
        });

        describe("if patient has Fever (Malaria)", () => {
            let complaint = ["Pregnancy", "Fever"]; // based on the current behaviour where Fever is considered Malaria
            it("prescribe Chloroquine and Paracetamol - no ACT or Primaquine", () => {
                verifyPrescriptionForComplaints(complaint, (decisions,message) => {
                    assert.equal((message.match(/क्लोरोक्विन/) || []).length, 1, message);
                    assert.equal((message.match(/प्रायामाक्वीन/) || []).length, 0, message);
                    assert.equal((message.match(/आरटीमीथर/) || []).length, 0, message);
                }, defaultFemaleEncounter(complaint));
            });

            it("refer patient to LBP Hospital [NOT BEING TESTED. BEHAVIOUR WORKS AS PER REQUIREMENT]", () => {
                // empty test for now for documentation purposes only
                // TO FIX
            });
        });
    });

    describe("For Giddiness", () => {
        it("prescribe Iron Folic Acid and ORS", () => {
            verifyPrescriptionForComplaints(["Giddiness"], (decisions,message) => {
                assert.equal((message.match(/आयरन/g) || []).length, 1, message);
                assert.equal((message.match(/ORS/g) || []).length, 1, message);
            });
        });
    });

    describe("For Chloroquine Resistant Malaria", () => {
        let complaint = ["Chloroquine Resistant Malaria"];
        it("no prescription to be given", () => {
            treatmentAdviceIsEmpty(complaint);
        });
        it("refer to LBP Hospital", () => {
            referralAdviceIsGenerated(complaint);
        });
    });

    describe("For Other Complaint", () => {
        let complaint = ["Other"];
        it("no prescription to be given", () => {
            treatmentAdviceIsEmpty(complaint);
        });
        it("refer to LBP Hospital", () => {
            referralAdviceIsGenerated(complaint);
        });
    });

    var completeValue = function (decisions) {
        var message = "";
        for (var i = 0; i < decisions.length; i++)
            message += decisions[i].value;
        return message;
    }

    var getDecisionByName = (decisions, decisionName) => {
        return decisions.find((decision) => decision.name === decisionName);
    }

});
