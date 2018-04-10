import {expect} from "chai";
import _ from "lodash";
import {prescription, convertPrescriptionsToMarathi, malariaPrescriptionMessage} from "../../health_modules/outpatient/malariaMedication";
import {
    Encounter,
    Concept,
    Observation,
    PrimitiveValue,
    Gender,
    SingleCodedValue,
    MultipleCodedValues,
    Individual
} from "openchs-models";
import EntityFactory from "../../../openchs-models/test/EntityFactory";
import moment from "moment";

describe("Malaria medications", () => {
    let encounter, weightConcept, paracheckConcept, complaintsConcept, complaintsObs;

    beforeEach(() => {
        complaintsConcept = EntityFactory.createConcept("Complaint", Concept.dataType.Coded);
        EntityFactory.addCodedAnswers(complaintsConcept, ["Body Ache", "Headache", "Abdominal pain", "Scabies", "Cold", "Wound", "Acidity", "Cough", "Diarrhoea", "Ring Worm", "Chloroquine Resistant Malaria", "Boils", "Pregnancy", "Giddiness", "Fever", "Vomiting"]);
        weightConcept = EntityFactory.createConcept("Weight", Concept.dataType.Numeric);
        paracheckConcept = EntityFactory.createConcept("Paracheck", Concept.dataType.Coded);
        EntityFactory.addCodedAnswers(paracheckConcept, ["Positive for PF", "Positive for PF and PV", "Positive for PV", "Negative"]);
        encounter = Encounter.create();
        encounter.individual = Individual.newInstance("0bdf1d2c-b918-47b8-ac59-343060c3de4b", "first", "last", moment().subtract(2, 'years').toDate(), true, Gender.create("Female"), 1);

        complaintsObs = Observation.create(complaintsConcept, new MultipleCodedValues());
        complaintsObs.toggleMultiSelectAnswer(complaintsConcept.getPossibleAnswerConcept("Fever").concept.uuid);
        encounter.observations.push(complaintsObs);
    });

    describe("Primaquine", () => {
        it("should be given when PV Positive", () => {
            const weightObs = Observation.create(weightConcept, new PrimitiveValue(35, Concept.dataType.Numeric));
            const paracheckObs = Observation.create(paracheckConcept, new SingleCodedValue());
            paracheckObs.toggleSingleSelectAnswer(paracheckConcept.getPossibleAnswerConcept("Positive for PV").concept.uuid);
            encounter.observations.push(weightObs);
            encounter.observations.push(paracheckObs);

            const prescriptions = prescription(encounter);
            const primaquine = _.find(prescriptions, (pres) => pres.medicine === 'Primaquine Tablets');

            expect(primaquine).to.be.ok;
            const primaquineDosage = primaquine.dosage;
            expect(primaquineDosage).to.be.an('object');
            expect(primaquineDosage.dosage).to.equal(10);
            expect(primaquineDosage.itemsPerServing).to.equal(1);
            expect(primaquineDosage.timesPerDay).to.equal(1);
        });

        it("dosage is not affected by edge conditions", () => {
            const weightObs = Observation.create(weightConcept, new PrimitiveValue(16, Concept.dataType.Numeric));
            const paracheckObs = Observation.create(paracheckConcept, new SingleCodedValue());
            paracheckObs.toggleSingleSelectAnswer(paracheckConcept.getPossibleAnswerConcept("Positive for PV").concept.uuid);
            encounter.observations.push(weightObs);
            encounter.observations.push(paracheckObs);

            let prescriptions = prescription(encounter);

            let primaquine = _.find(prescriptions, (pres) => pres.medicine === 'Primaquine Tablets');
            let primaquineDosage = primaquine.dosage;
            expect(primaquineDosage.dosage).to.equal(2.5);
            expect(primaquineDosage.itemsPerServing).to.equal(2);
            expect(primaquineDosage.timesPerDay).to.equal(1);


            weightObs.valueJSON = new PrimitiveValue(25.5, Concept.dataType.Numeric);
            prescriptions = prescription(encounter);

            primaquine = _.find(prescriptions, (pres) => pres.medicine === 'Primaquine Tablets');
            primaquineDosage = primaquine.dosage;
            expect(primaquineDosage.dosage).to.equal(2.5);
            expect(primaquineDosage.itemsPerServing).to.equal(2);
            expect(primaquineDosage.timesPerDay).to.equal(1);


            weightObs.valueJSON = new PrimitiveValue(15.99, Concept.dataType.Numeric);
            prescriptions = prescription(encounter);

            primaquine = _.find(prescriptions, (pres) => pres.medicine === 'Primaquine Tablets');
            primaquineDosage = primaquine.dosage;
            expect(primaquineDosage.dosage).to.equal(2.5);
            expect(primaquineDosage.itemsPerServing).to.equal(2);
            expect(primaquineDosage.timesPerDay).to.equal(1);
        });

        it("should not be given to women between 16 and 40 years of age", () => {
            const weightObs = Observation.create(weightConcept, new PrimitiveValue(16, Concept.dataType.Numeric));
            const paracheckObs = Observation.create(paracheckConcept, new SingleCodedValue());
            paracheckObs.toggleSingleSelectAnswer(paracheckConcept.getPossibleAnswerConcept("Positive for PV").concept.uuid);
            encounter.observations.push(weightObs);
            encounter.observations.push(paracheckObs);

            encounter.individual.dateOfBirth = moment().subtract(16, 'years').toDate();

            let prescriptions = prescription(encounter);
            let primaquine = _.find(prescriptions, (pres) => pres.medicine === 'Primaquine Tablets');
            expect(primaquine).to.be.undefined;
        });

        it("should not be given to pregnant women", () => {
            const weightObs = Observation.create(weightConcept, new PrimitiveValue(16, Concept.dataType.Numeric));
            const paracheckObs = Observation.create(paracheckConcept, new SingleCodedValue());
            paracheckObs.toggleSingleSelectAnswer(paracheckConcept.getPossibleAnswerConcept("Positive for PV").concept.uuid);
            complaintsObs.toggleMultiSelectAnswer(complaintsConcept.getPossibleAnswerConcept("Pregnancy").concept.uuid);
            encounter.observations.push(weightObs);
            encounter.observations.push(paracheckObs);

            encounter.individual.dateOfBirth = moment().subtract(13, 'years').toDate();

            let prescriptions = prescription(encounter);
            let primaquine = _.find(prescriptions, (pres) => pres.medicine === 'Primaquine Tablets');
            expect(primaquine).to.be.undefined;
        });

        it("should not be given to children below 1 year of age", () => {
            const weightObs = Observation.create(weightConcept, new PrimitiveValue(16, Concept.dataType.Numeric));
            const paracheckObs = Observation.create(paracheckConcept, new SingleCodedValue());
            paracheckObs.toggleSingleSelectAnswer(paracheckConcept.getPossibleAnswerConcept("Positive for PV").concept.uuid);
            encounter.observations.push(weightObs);
            encounter.observations.push(paracheckObs);

            encounter.individual.gender = Gender.create("Male");
            encounter.individual.dateOfBirth = moment().subtract(1, 'years').add(1, 'day').toDate();

            let prescriptions = prescription(encounter);
            let primaquine = _.find(prescriptions, (pres) => pres.medicine === 'Primaquine Tablets');
            expect(primaquine).not.to.be.ok;

            encounter.individual.dateOfBirth = moment().subtract(2, 'years').toDate();

            prescriptions = prescription(encounter);
            primaquine = _.find(prescriptions, (pres) => pres.medicine === 'Primaquine Tablets');
            expect(primaquine).to.be.ok;
        });
    });

    describe("ACT", () => {
        it("should be given when PF positive", () => {
            const paracheckObs = Observation.create(paracheckConcept, new SingleCodedValue());
            paracheckObs.toggleSingleSelectAnswer(paracheckConcept.getPossibleAnswerConcept("Positive for PF").concept.uuid);
            encounter.observations.push(paracheckObs);
            encounter.individual.dateOfBirth = moment().subtract(2, 'years').toDate();

            let prescriptions = prescription(encounter);
            expect(prescriptions).to.have.lengthOf(3);
            let act = _.find(prescriptions, (pres) => pres.medicine === 'ACT');
            expect(act).to.be.not.undefined;

            expect(_.map(prescriptions, 'dosage')).to.deep.include({day: 1, code: "A1", row: 1, itemsPerServing: 2});
            expect(_.map(prescriptions, 'dosage')).to.deep.include({day: 2, code: "A1", row: 2, itemsPerServing: 1});
            expect(_.map(prescriptions, 'dosage')).to.deep.include({day: 3, code: "A1", row: 3, itemsPerServing: 1});
        });

        it("should not be given when PV positive", () => {
            const paracheckObs = Observation.create(paracheckConcept, new SingleCodedValue());
            paracheckObs.toggleSingleSelectAnswer(paracheckConcept.getPossibleAnswerConcept("Positive for PV").concept.uuid);
            let prescriptions = prescription(encounter);
            let act = _.find(prescriptions, (pres) => pres.medicine === 'ACT');
            expect(act).to.be.undefined;
        });

        it("should not be given to pregnant women", () => {
            const paracheckObs = Observation.create(paracheckConcept, new SingleCodedValue());
            const weightObs = Observation.create(weightConcept, new PrimitiveValue(16, Concept.dataType.Numeric));
            paracheckObs.toggleSingleSelectAnswer(paracheckConcept.getPossibleAnswerConcept("Positive for PF").concept.uuid);
            complaintsObs.toggleMultiSelectAnswer(complaintsConcept.getPossibleAnswerConcept("Pregnancy").concept.uuid);
            encounter.observations.push(paracheckObs);
            encounter.observations.push(weightObs);
            encounter.individual.dateOfBirth = moment().subtract(14, 'years').toDate();

            let prescriptions = prescription(encounter);
            let act = _.find(prescriptions, (pres) => pres.medicine === 'ACT');
            expect(act).to.be.undefined;
        });

    });

    describe("Chloroquine", () => {
        it("should be given when PV Positive", () => {
            const weightObs = Observation.create(weightConcept, new PrimitiveValue(16, Concept.dataType.Numeric));
            const paracheckObs = Observation.create(paracheckConcept, new SingleCodedValue());
            paracheckObs.toggleSingleSelectAnswer(paracheckConcept.getPossibleAnswerConcept("Positive for PV").concept.uuid);
            encounter.observations.push(weightObs);
            encounter.observations.push(paracheckObs);

            encounter.individual.gender = Gender.create("Male");
            encounter.individual.dateOfBirth = moment().subtract(10, 'years').toDate();

            let prescriptions = prescription(encounter);
            let chloroquine = _.find(prescriptions, (pres) => pres.medicine === 'Chloroquine Tablets');
            expect(chloroquine).to.be.not.undefined;
        }) ;

        it("should be given when patient is pregnant and PF Positive", () => {
            const paracheckObs = Observation.create(paracheckConcept, new SingleCodedValue());
            const weightObs = Observation.create(weightConcept, new PrimitiveValue(16, Concept.dataType.Numeric));
            paracheckObs.toggleSingleSelectAnswer(paracheckConcept.getPossibleAnswerConcept("Positive for PF").concept.uuid);
            complaintsObs.toggleMultiSelectAnswer(complaintsConcept.getPossibleAnswerConcept("Pregnancy").concept.uuid);
            encounter.observations.push(paracheckObs);
            encounter.observations.push(weightObs);
            encounter.individual.dateOfBirth = moment().subtract(14, 'years').toDate();

            let prescriptions = prescription(encounter);
            let act = _.find(prescriptions, (pres) => pres.medicine === 'ACT');
            expect(act).to.be.undefined;
            let chloroquine = _.find(prescriptions, (pres) => pres.medicine === 'Chloroquine Tablets');
            expect(chloroquine).to.be.not.undefined;
        });

        it("should be given when patient is pregnant and Positive for PF and PV", () => {
            const paracheckObs = Observation.create(paracheckConcept, new SingleCodedValue());
            const weightObs = Observation.create(weightConcept, new PrimitiveValue(16, Concept.dataType.Numeric));
            paracheckObs.toggleSingleSelectAnswer(paracheckConcept.getPossibleAnswerConcept("Positive for PF and PV").concept.uuid);
            complaintsObs.toggleMultiSelectAnswer(complaintsConcept.getPossibleAnswerConcept("Pregnancy").concept.uuid);
            encounter.observations.push(paracheckObs);
            encounter.observations.push(weightObs);
            encounter.individual.dateOfBirth = moment().subtract(14, 'years').toDate();

            let prescriptions = prescription(encounter);
            let chloroquine = _.find(prescriptions, (pres) => pres.medicine === 'Chloroquine Tablets');
            expect(chloroquine).to.be.not.undefined;
        });

        it("is given when paracheck/malaria negative", () => {
            const weightObs = Observation.create(weightConcept, new PrimitiveValue(16, Concept.dataType.Numeric));
            const paracheckObs = Observation.create(paracheckConcept, new SingleCodedValue());
            paracheckObs.toggleSingleSelectAnswer(paracheckConcept.getPossibleAnswerConcept("Negative").concept.uuid);
            encounter.observations.push(weightObs);
            encounter.observations.push(paracheckObs);

            encounter.individual.gender = Gender.create("Male");
            encounter.individual.dateOfBirth = moment().subtract(10, 'years').toDate();

            let prescriptions = prescription(encounter);
            let chloroquine = _.find(prescriptions, (pres) => pres.medicine === 'Chloroquine Tablets');
            expect(chloroquine).to.be.ok;
        }) ;

        it("is given when Paracheck result not provided", () => {
            const weightObs = Observation.create(weightConcept, new PrimitiveValue(16, Concept.dataType.Numeric));
            encounter.observations.push(weightObs);

            encounter.individual.gender = Gender.create("Male");
            encounter.individual.dateOfBirth = moment().subtract(10, 'years').toDate();

            let prescriptions = prescription(encounter);
            let chloroquine = _.find(prescriptions, (pres) => pres.medicine === 'Chloroquine Tablets');
            expect(chloroquine).to.be.ok;
        });

    });

    describe("Primaquine, ACT & Paracetamol", () => {
        it("should be given when Positive for PF and PV", () => {
            const weightObs = Observation.create(weightConcept, new PrimitiveValue(16, Concept.dataType.Numeric));
            const paracheckObs = Observation.create(paracheckConcept, new SingleCodedValue());
            paracheckObs.toggleSingleSelectAnswer(paracheckConcept.getPossibleAnswerConcept("Positive for PF and PV").concept.uuid);
            encounter.observations.push(weightObs);
            encounter.observations.push(paracheckObs);

            encounter.individual.gender = Gender.create("Male");
            encounter.individual.dateOfBirth = moment().subtract(10, 'years').toDate();

            //Expected result for ACT, Paracetamol and Primaquine
            // पहिल्या दिवशी
            // आरटीमीथर कॉम्बीणेशन थेरपी पहिल्या रांगेतील तीन गोळ्या
            // दुसऱ्या दिवशी
            // आरटीमीथर कॉम्बीणेशन थेरपी दुसऱ्या रांगेतील एक गोळी
            // तिसऱ्या दिवशी
            // आरटीमीथर कॉम्बीणेशन थेरपी तिसऱ्या रांगेतील एक गोळी
            //
            // पॅरासिटामॉल अर्धी गोळी दिवसातून ३ वेळा १ ते ३ दिवसांसाठी
            // प्रायामाक्वीन २.५ mg दोन गोळ्या दिवसातून १ वेळा १ ते १४ दिवसांसाठी
            console.log(malariaPrescriptionMessage(encounter));
            expect(malariaPrescriptionMessage(encounter)).to.equal('पहिल्या दिवशी\nआरटीमीथर कॉम्बीणेशन थेरपी पहिल्या रांगेतील तीन गोळ्या \nदुसऱ्या दिवशी\nआरटीमीथर कॉम्बीणेशन थेरपी दुसऱ्या रांगेतील एक गोळी \nतिसऱ्या दिवशी\nआरटीमीथर कॉम्बीणेशन थेरपी तिसऱ्या रांगेतील एक गोळी \n\nपॅरासिटामॉल अर्धी गोळी दिवसातून ३ वेळा १ ते ३ दिवसांसाठी\nप्रायामाक्वीन २.५ mg दोन गोळ्या दिवसातून १ वेळा १ ते १४ दिवसांसाठी');
        });

        it("Primaquine & ACT should not be given when patient is pregnant and Positive for PF and PV", () => {
            const paracheckObs = Observation.create(paracheckConcept, new SingleCodedValue());
            const weightObs = Observation.create(weightConcept, new PrimitiveValue(16, Concept.dataType.Numeric));
            paracheckObs.toggleSingleSelectAnswer(paracheckConcept.getPossibleAnswerConcept("Positive for PF and PV").concept.uuid);
            complaintsObs.toggleMultiSelectAnswer(complaintsConcept.getPossibleAnswerConcept("Pregnancy").concept.uuid);
            encounter.observations.push(paracheckObs);
            encounter.observations.push(weightObs);
            encounter.individual.dateOfBirth = moment().subtract(14, 'years').toDate();

            let prescriptions = prescription(encounter);
            let act = _.find(prescriptions, (pres) => pres.medicine === 'ACT');
            expect(act).to.be.undefined;
            let primaquine = _.find(prescriptions, (pres) => pres.medicine === 'Primaquine Tablets');
            expect(primaquine).to.be.undefined;
        });
    });
});

describe("Conversion to marathi", () => {

    it("should be done for Primaquine tablets", () => {
        let prescriptions = [{
            medicine: "Primaquine Tablets",
            type: "Tablet",
            dosageType: "uniform",
            dosageUnit: "mg",
            form: "Tablets",
            dosage: {days: 14, dosage: 2.5, itemsPerServing: 1, timesPerDay: 1}
        }];

        expect(convertPrescriptionsToMarathi(prescriptions)).to.have.string("प्रायामाक्वीन २.५ mg एक गोळी दिवसातून १ वेळा १ ते १४ दिवसांसाठी");

        prescriptions = [{
            medicine: "Primaquine Tablets",
            type: "Tablet",
            dosageType: "uniform",
            dosageUnit: "mg",
            form: "Tablets",
            dosage: {days: 14, dosage: 7.5, itemsPerServing: 0.5, timesPerDay: 1}
        }];
        console.log(convertPrescriptionsToMarathi(prescriptions))
        expect(convertPrescriptionsToMarathi(prescriptions)).to.have.string("प्रायामाक्वीन ७.५ mg अर्धी गोळी दिवसातून १ वेळा १ ते १४ दिवसांसाठी");

        prescriptions = [{
            medicine: "Primaquine Tablets",
            type: "Tablet",
            dosageType: "uniform",
            dosageUnit: "mg",
            form: "Tablets",
            dosage: {days: 14, dosage: 2.5, itemsPerServing: 2, timesPerDay: 1}
        }];
        console.log(convertPrescriptionsToMarathi(prescriptions))

        expect(convertPrescriptionsToMarathi(prescriptions)).to.have.string("प्रायामाक्वीन २.५ mg दोन गोळ्या दिवसातून १ वेळा १ ते १४ दिवसांसाठी");

        prescriptions = [{
            medicine: "Primaquine Tablets",
            type: "Tablet",
            dosageType: "uniform",
            dosageUnit: "mg",
            form: "Tablets",
            dosage: {days: 14, dosage: 10, itemsPerServing: 1, timesPerDay: 1}
        }];
        console.log(convertPrescriptionsToMarathi(prescriptions))

        expect(convertPrescriptionsToMarathi(prescriptions)).to.have.string("प्रायामाक्वीन १० mg (७.५ mg+२.५ mg) एक गोळी दिवसातून १ वेळा १ ते १४ दिवसांसाठी");
    });


    it("should be done for ACT tablets", () => {
        let prescriptions = [{
            medicine: "ACT",
            type: "Tablet",
            dosageType: "daywise",
            form: "Tablets",
            dosage: {day: 1, row: 1, itemsPerServing: 2},
        }];

        expect(convertPrescriptionsToMarathi(prescriptions)).to.have.string("आरटीमीथर कॉम्बीणेशन थेरपी पहिल्या रांगेतील दोन गोळ्या");
    });
});


