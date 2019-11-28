import {assert} from "chai";
import {
    ProgramEncounter, ProgramEnrolment, Observation, Concept, PrimitiveValue, MultipleCodedValues,
    Individual, Gender, AddressLevel
} from 'avni-models';
import EntityFactory from "../helpers/EntityFactory";
import {RuleCondition} from "rules-config/rules";

describe('RuleConditions', () => {
    var programEncounter, form, a1, a2, codedConceptA1;

    beforeEach(() => {
        programEncounter = ProgramEncounter.createEmptyInstance();
        programEncounter.programEnrolment = ProgramEnrolment.createEmptyInstance();
        let address = AddressLevel.create({uuid: "eea64e54-dd5b-41fb-91aa-c6b4f4490bea", title: "Boarding", level: 1, typeString: "Boarding"});
        let male = new Gender();
        male.name = "Male";
        let individual = Individual.newInstance("f585d2f0-c148-460c-b7ac-d1d3923cf14c", "Ramesh", "Nair", new Date(2010, 1, 1), true, male, 1);
        individual.lowestAddressLevel = address;
        programEncounter.programEnrolment.individual = individual;
        programEncounter.encounterDateTime = new Date();
        programEncounter.programEnrolment.enrolmentDateTime = new Date(2017, 0, 0, 5);
        programEncounter.programEnrolment.encounters.push(programEncounter);
        let conceptA1 = EntityFactory.createConcept('a1', Concept.dataType.Numeric);
        let conceptA2 = EntityFactory.createConcept('a2', Concept.dataType.Numeric);
        let conceptB1 = EntityFactory.createConcept('b1', Concept.dataType.Numeric);
        codedConceptA1 = EntityFactory.createConcept("coded question a1", Concept.dataType.Coded,);
        EntityFactory.addCodedAnswers(codedConceptA1, ["coded answer 1", "coded answer 2"]);

        programEncounter.observations.push(Observation.create(conceptA1, JSON.stringify(new PrimitiveValue('10', Concept.dataType.Numeric))));

        let anotherProgramEncounter = ProgramEncounter.createEmptyInstance();
        anotherProgramEncounter.observations.push(Observation.create(conceptB1, JSON.stringify(new PrimitiveValue('10', Concept.dataType.Numeric))));
        programEncounter.programEnrolment.encounters.push(anotherProgramEncounter);

        form = EntityFactory.createForm('foo');
        const formElementGroup1 = EntityFactory.createFormElementGroup('bar', 1, form);
        formElementGroup1.addFormElement(EntityFactory.createFormElement('a1', false, conceptA1, 1));
        formElementGroup1.addFormElement(EntityFactory.createFormElement('a2', false, conceptA2, 2));

        const formElementGroup2 = EntityFactory.createFormElementGroup('bar1', 1, form);
        formElementGroup2.addFormElement(EntityFactory.createFormElement('b1', false, conceptB1, 1));
        const formElement = EntityFactory.createFormElement('b2');
        formElementGroup2.addFormElement(formElement);


        a1 = new RuleCondition({
            conceptName: 'a1',
            programEncounter: programEncounter,
            form: form,
            programEnrolment: programEncounter.programEnrolment
        });

        a2 = new RuleCondition({
            conceptName: 'a2',
            programEncounter: programEncounter,
            form: form,
            programEnrolment: programEncounter.programEnrolment
        });
    });

    it('match to true by default', () => {
        assert.isTrue(a1.matches());
        assert.isTrue(a2.matches());

    });

    it('filledAtleastOnceInEntireEnrolment checks if value is filled at least once in entire enrolment', () => {
        assert.isTrue(a1.when.filledAtleastOnceInEntireEnrolment.matches());
        assert.isFalse(a2.when.filledAtleastOnceInEntireEnrolment.matches());
    });


    it("valueInEntireEnrolment checks for the same or a different concept's value to be equal to something", () => {
        assert.isTrue(a1.when.valueInEntireEnrolment('a1').equals(10).matches());
        assert.isFalse(a1.when.valueInEntireEnrolment('a1').equals(null).matches());
        assert.isFalse(a1.when.valueInEntireEnrolment('a2').equals(10).matches());
    });

    it("truthy checks currently inspected value to be truthy", () => {
        assert.isTrue(a1.when.valueInEntireEnrolment('a1').is.truthy.matches());
        assert.isFalse(a1.when.valueInEntireEnrolment('a2').is.truthy.matches());
        assert.isFalse(a1.when.valueInEntireEnrolment('c1').is.truthy.matches());
    });

    it("matchesFn checks currently inspected value to be truthy", () => {
        assert.isTrue(a1.when.valueInEntireEnrolment('a1').matchesFn(() => true).matches());
        assert.isFalse(a1.when.valueInEntireEnrolment('a1').matchesFn(() => false).matches());
        assert.isFalse(a1.when.valueInEntireEnrolment('c1').matchesFn((value) => {
            return value;
        }).matches());
    });

    it("valueInEncounter checks for the same or a different concept's value to be equal to something", () => {
        assert.isTrue(a1.when.valueInEncounter('a1').is.truthy.matches());
        assert.isFalse(a1.when.valueInEncounter('b1').is.truthy.matches());
    });

    it("male checks if the program encounter is for a male", () => {
        assert.isTrue(a1.when.male.matches());
        assert.isFalse(a1.when.female.matches());
    });

    it("age checks for the age at the time of the program encounter", () => {
        assert.isTrue(a1.when.age.is.greaterThan(5).matches());
        assert.isTrue(a1.when.age.is.greaterThanOrEqualTo(5).matches());
        assert.isFalse(a1.when.age.is.lessThan(5).matches());
    });

    it('whenItem checks for a constant value. to match', () => {
        assert.isTrue(a2.whenItem(programEncounter.programEnrolment.findObservationInEntireEnrolment('a1').getValue()).equals(10).matches());
    });

    it("containsAnswerConceptName checks if the specified concept name exists in the result", () => {
        let codedObservation = Observation.create(codedConceptA1, new MultipleCodedValues());
        codedObservation.toggleMultiSelectAnswer(codedConceptA1.getPossibleAnswerConcept("coded answer 1").concept.uuid);
        programEncounter.observations.push(codedObservation);


        let ruleCondition = new RuleCondition({
            conceptName: codedConceptA1.name,
            programEncounter: programEncounter,
            form: form,
            programEnrolment: programEncounter.programEnrolment
        });

        assert.isTrue(ruleCondition.when.valueInEncounter(codedConceptA1.name).containsAnswerConceptName("coded answer 1").matches());
        assert.isFalse(ruleCondition.when.valueInEncounter(codedConceptA1.name).containsAnswerConceptName("coded answer 2").matches());
        assert.isFalse(ruleCondition.when.valueInEncounter("non-existent question").containsAnswerConceptName("coded answer 2").matches());
        assert.isFalse(ruleCondition.when.valueInEncounter(codedConceptA1.name).containsAnswerConceptName("non-existent answer").matches());
        assert.isFalse(ruleCondition.when.valueInEncounter(codedConceptA1.name).containsAnswerConceptName(undefined).matches());
        assert.isFalse(ruleCondition.when.valueInEncounter(undefined).containsAnswerConceptName(undefined).matches());

        codedObservation.toggleMultiSelectAnswer(codedConceptA1.getPossibleAnswerConcept("coded answer 2").concept.uuid);
        assert.isTrue(ruleCondition.when.valueInEncounter(codedConceptA1.name).containsAnswerConceptName("coded answer 1").matches());
        assert.isTrue(ruleCondition.when.valueInEncounter(codedConceptA1.name).containsAnswerConceptName("coded answer 2").matches());
    });

    it("containsAnyAnswerConceptName checks if any of the specified concept names exists in the result", () => {
        let codedObservation = Observation.create(codedConceptA1, new MultipleCodedValues());
        codedObservation.toggleMultiSelectAnswer(codedConceptA1.getPossibleAnswerConcept("coded answer 1").concept.uuid);
        programEncounter.observations.push(codedObservation);


        let ruleCondition = new RuleCondition({
            conceptName: codedConceptA1.name,
            programEncounter: programEncounter,
            form: form,
            programEnrolment: programEncounter.programEnrolment
        });

        assert.isTrue(ruleCondition.when.valueInEncounter(codedConceptA1.name).containsAnyAnswerConceptName("coded answer 1").matches());
        assert.isFalse(ruleCondition.when.valueInEncounter(codedConceptA1.name).containsAnyAnswerConceptName("coded answer 2").matches());
        assert.isTrue(ruleCondition.when.valueInEncounter(codedConceptA1.name).containsAnyAnswerConceptName("coded answer 1", "coded answer 2").matches());
        assert.isTrue(ruleCondition.when.valueInEncounter(codedConceptA1.name).containsAnyAnswerConceptName("coded answer 1", "coded answer 2", "non-existent answer").matches());

    });

    it('lessThan and greaterThan can be used to do inequality checks', () => {
        assert.isTrue(a1.when.valueInEntireEnrolment('a1').is.lessThan(20).matches());
        assert.isFalse(a1.when.valueInEntireEnrolment('a1').is.lessThan(5).matches());
        assert.isFalse(a1.when.valueInEntireEnrolment('a1').is.lessThan(10).matches());

        assert.isTrue(a1.when.valueInEntireEnrolment('a1').is.greaterThan(5).matches());
        assert.isFalse(a1.when.valueInEntireEnrolment('a1').is.greaterThan(20).matches());
        assert.isTrue(a1.when.valueInEntireEnrolment('a1').is.greaterThan(5).matches());
        assert.isFalse(a1.when.valueInEntireEnrolment('a1').is.greaterThan(10).matches());
    });

    it('not negates any condition', () => {
        assert.isTrue(a1.when.valueInEntireEnrolment('a1').is.not.lessThan(5).matches());
    });

    it('and can be used to do multiple checks', () => {
        assert.isTrue(a1.when.valueInEntireEnrolment('a1').is.lessThan(15).and.valueInEntireEnrolment('a1').is.greaterThan(5).matches());
        assert.isTrue(a1.when.valueInEntireEnrolment('a1').is.lessThan(15).and.greaterThan(5).matches());
    });

    it('or can be used to do multiple checks as well', () => {
        assert.isTrue(a1.when.valueInEntireEnrolment('a1').is.lessThan(5).or.valueInEntireEnrolment('a1').is.greaterThan(5).matches());
    });

    it("and and or are evaluated right to left", () => {
        assert.isTrue(a1.when.whenItem(1).is.lessThan(5).and.greaterThan(5).or.lessThan(5).matches());
        assert.isFalse(a1.when.whenItem(1).is.greaterThan(5).and.lessThan(5).or.greaterThan(5).matches());
    });

    it("addressType matches given value", () => {
        assert.isFalse(a1.when.addressType.equals("School").matches());
        assert.isTrue(a1.when.addressType.equals("Boarding").matches());
        assert.isTrue(a1.when.addressType.equals("Boarding").or.equals("School").matches());
        assert.isTrue(a1.when.addressType.equals("School").or.equals("Boarding").matches());
    });
});