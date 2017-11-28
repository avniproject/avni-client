import {assert} from "chai";
import FormFilter from "../../health_modules/rules/FormFilter";
import {ProgramEncounter, ProgramEnrolment, Observation, Concept, PrimitiveValue} from "openchs-models";
import EntityFactory from "openchs-models/test/EntityFactory";

describe('FormFilter', () => {
    var programEncounter, form, formFilter;

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


        formFilter = new FormFilter({
            programEncounter: programEncounter,
            programEnrolment: programEncounter.programEnrolment,
            form: form
        });
    });


    it('take in a context object that has a form and an encounter', () => {
        assert.equal(formFilter.context.form, form);
    });

    it('can hide a form element by name', () => {
        formFilter.hide('a2');

        let filteredForm = formFilter.filteredForm();
        assert.isDefined(filteredForm.findFormElement('a1'));
        assert.isUndefined(filteredForm.findFormElement('a2'));

    });

    it('can hide a form element by name when not filledAtleastOnceInEntireEnrolment before in the enrolment', () => {
        formFilter.hide('a1').when.filledAtleastOnceInEntireEnrolment;

        let filteredForm = formFilter.filteredForm();
        assert.isUndefined(filteredForm.findFormElement('a1'));
        assert.isDefined(filteredForm.findFormElement('a2'));
    });

    it('can hide a form element by name when an enrolment observation is not filledAtleastOnceInEntireEnrolment', () => {
        formFilter.hide('a1').when.filledAtleastOnceInEntireEnrolment;

        let filteredForm = formFilter.filteredForm();
        assert.isUndefined(filteredForm.findFormElement('a1'));
        assert.isDefined(filteredForm.findFormElement('a2'));
    });

    it('can hide a form element by name when an enrolment observation is equal to a specific value', () => {
        formFilter.hide('a1').when.valueInEntireEnrolment('a1').equals(10);

        let filteredForm = formFilter.filteredForm();

        assert.isUndefined(filteredForm.findFormElement('a1'));
        assert.isDefined(filteredForm.findFormElement('a2'));
    });

    it('can also provide the value for concept directly', () => {
        formFilter.hide('a2').whenItem(programEncounter.programEnrolment.findObservationInEntireEnrolment('a1').getValue()).equals(10);

        let filteredForm = formFilter.filteredForm();

        assert.isDefined(filteredForm.findFormElement('a1'));
        assert.isUndefined(filteredForm.findFormElement('a2'));
    });

    it('can hide a form element by name when an enrolment observation is less than to a specific value', () => {
        formFilter.hide('a1').when.valueInEntireEnrolment('a1').is.lessThan(20);

        let filteredForm = formFilter.filteredForm();

        assert.isUndefined(filteredForm.findFormElement('a1'));
        assert.isDefined(filteredForm.findFormElement('a2'));
    });

    it('can have negation rules using the not function', () => {
        formFilter.hide('a1').when.valueInEntireEnrolment('a1').is.not.lessThan(5);

        let filteredForm = formFilter.filteredForm();

        assert.isUndefined(filteredForm.findFormElement('a1'));
        assert.isDefined(filteredForm.findFormElement('a2'));
    });

    it('uses and as a conjunction', () => {
        formFilter.hide('a1').when.valueInEntireEnrolment('a1').is.lessThan(15).and.valueInEntireEnrolment('a1').is.greaterThan(5);

        let filteredForm = formFilter.filteredForm();

        assert.isUndefined(filteredForm.findFormElement('a1'));
        assert.isDefined(filteredForm.findFormElement('a2'));
    });

    it('uses or as a conjunction', () => {
        formFilter.hide('a1').when.valueInEntireEnrolment('a1').is.lessThan(5).or.valueInEntireEnrolment('a1').is.greaterThan(5);

        let filteredForm = formFilter.filteredForm();

        assert.isUndefined(filteredForm.findFormElement('a1'));
        assert.isDefined(filteredForm.findFormElement('a2'));
    });
});