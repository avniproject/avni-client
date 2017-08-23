import {expect} from "chai";
import FormRules from "../../../js/models/application/FormFilter";
import ProgramEncounter from "../../../js/models/ProgramEncounter";
import ProgramEnrolment from "../../../js/models/ProgramEnrolment";
import EntityFactory from "../EntityFactory";
import Observation from "../../../js/models/Observation";
import Concept from "../../../js/models/Concept";
import PrimitiveValue from "../../../js/models/observation/PrimitiveValue";

describe('FormFilter', () => {
    var programEncounter, form, rules;

    beforeEach(()=> {
        programEncounter = ProgramEncounter.createEmptyInstance();
        programEncounter.programEnrolment = ProgramEnrolment.createEmptyInstance();
        programEncounter.encounterDateTime = new Date();
        programEncounter.programEnrolment.enrolmentDateTime = new Date(2017, 0, 0, 5);
        programEncounter.programEnrolment.encounters.push(programEncounter);
        let conceptA1 = EntityFactory.createConcept('a1', Concept.dataType.Numeric);
        let conceptA2 = EntityFactory.createConcept('a2', Concept.dataType.Numeric);
        let conceptB1 = EntityFactory.createConcept('b1', Concept.dataType.Numeric);
        programEncounter.observations.push(Observation.create(conceptA1, JSON.stringify(new PrimitiveValue('10', Concept.dataType.Numeric))));


        form = EntityFactory.createForm('foo');
        const formElementGroup1 = EntityFactory.createFormElementGroup('bar', 1, form);
        formElementGroup1.addFormElement(EntityFactory.createFormElement('a1', false, conceptA1, 1));
        formElementGroup1.addFormElement(EntityFactory.createFormElement('a2', false, conceptA2, 2));

        const formElementGroup2 = EntityFactory.createFormElementGroup('bar1', 1, form);
        formElementGroup2.addFormElement(EntityFactory.createFormElement('b1', false, conceptB1, 1));
        const formElement = EntityFactory.createFormElement('b2');
        formElementGroup2.addFormElement(formElement);


        rules = new FormRules({
            programEncounter: programEncounter,
            programEnrolment: programEncounter.programEnrolment,
            form: form
        });
    });


    it('take in a context object that has a form and an encounter', () => {
        expect(rules.context.form).to.equal(form);
    });

    it('can hide a form element by name', () => {
        rules.hide('a2');

        let filteredForm = rules.filteredForm();
        expect(filteredForm.findFormElement('a1')).not.to.be.undefined;
        expect(filteredForm.findFormElement('a2')).to.be.undefined;

    });

    it('can hide a form element by name when not filledAtleastOnceInEntireEnrolment before in the enrolment', () => {
        rules.hide('a1').when.filledAtleastOnceInEntireEnrolment;

        let filteredForm = rules.filteredForm();
        expect(filteredForm.findFormElement('a1')).to.be.undefined;
        expect(filteredForm.findFormElement('a2')).not.to.be.undefined;
    });

    it('can hide a form element by name when an enrolment observation is not filledAtleastOnceInEntireEnrolment', () => {
        rules.hide('a1').when.filledAtleastOnceInEntireEnrolment;

        let filteredForm = rules.filteredForm();
        expect(filteredForm.findFormElement('a1')).to.be.undefined;
        expect(filteredForm.findFormElement('a2')).not.to.be.undefined;
    });

    it('can hide a form element by name when an enrolment observation is equal to a specific value', () => {
        rules.hide('a1').when.valueInEntireEnrolment('a1').equals(10);

        let filteredForm = rules.filteredForm();

        expect(filteredForm.findFormElement('a1')).to.be.undefined;
        expect(filteredForm.findFormElement('a2')).not.to.be.undefined;
    });

    it('can also provide the value for concept directly', () => {
        rules.hide('a2').whenItem(programEncounter.programEnrolment.findObservationInEntireEnrolment('a1').getValue()).equals(10);

        let filteredForm = rules.filteredForm();

        expect(filteredForm.findFormElement('a1')).not.to.be.undefined;
        expect(filteredForm.findFormElement('a2')).to.be.undefined;
    });

    it('can hide a form element by name when an enrolment observation is less than to a specific value', () => {
        rules.hide('a1').when.valueInEntireEnrolment('a1').is.lessThan(20);

        let filteredForm = rules.filteredForm();

        expect(filteredForm.findFormElement('a1')).to.be.undefined;
        expect(filteredForm.findFormElement('a2')).not.to.be.undefined;
    });

    it('can have negation rules using the not function', () => {
        rules.hide('a1').when.valueInEntireEnrolment('a1').is.not.lessThan(5);

        let filteredForm = rules.filteredForm();

        expect(filteredForm.findFormElement('a1')).to.be.undefined;
        expect(filteredForm.findFormElement('a2')).not.to.be.undefined;
    });

    it('uses and as a conjunction', () => {
        rules.hide('a1').when.valueInEntireEnrolment('a1').is.lessThan(15).and.valueInEntireEnrolment('a1').is.greaterThan(5);

        let filteredForm = rules.filteredForm();

        expect(filteredForm.findFormElement('a1')).to.be.undefined;
        expect(filteredForm.findFormElement('a2')).not.to.be.undefined;
    });

    it('uses or as a conjunction', () => {
        rules.hide('a1').when.valueInEntireEnrolment('a1').is.lessThan(5).or.valueInEntireEnrolment('a1').is.greaterThan(5);

        let filteredForm = rules.filteredForm();

        expect(filteredForm.findFormElement('a1')).to.be.undefined;
        expect(filteredForm.findFormElement('a2')).not.to.be.undefined;
    });
});