import {expect} from "chai";
import EntityFactory from "../EntityFactory";
import Concept from '../../../js/models/Concept';
import ObservationRule from "../../../js/models/observation/ObservationRule";

describe('FormElementGroupTest', () => {
    it('previous and next', () => {
        const form = EntityFactory.createForm('form1');
        const first = EntityFactory.createFormElementGroup('foo', 1, form);
        form.addFormElementGroup(first);
        const second = EntityFactory.createFormElementGroup('bar', 2, form);
        form.addFormElementGroup(second);
        const third = EntityFactory.createFormElementGroup('baz', 3, form);
        form.addFormElementGroup(third);

        expect(first.next()).is.not.equal(undefined);
        expect(second.next()).is.not.equal(undefined);
        expect(third.next()).is.equal(undefined);

        expect(first.previous()).is.equal(undefined);
        expect(third.previous()).is.not.equal(undefined);
        expect(second.previous()).is.not.equal(undefined);

        expect(first.isFirst).is.equal(true);
        expect(second.isFirst).is.equal(false);
    });

    it('getFormElements', () => {
        const form = EntityFactory.createForm('form1');
        const formElementGroup = EntityFactory.createFormElementGroup('foo', 1, form);
        formElementGroup.addFormElement(EntityFactory.createFormElement("bar", false, EntityFactory.createConcept("bar", Concept.dataType.Text), 2));
        formElementGroup.addFormElement(EntityFactory.createFormElement("baz", false, EntityFactory.createConcept("bar", Concept.dataType.Text), 1));
        expect(formElementGroup.getFormElements().length).is.equal(2);
    });

    it('getApplicableFormElements', () => {
        const form = EntityFactory.createForm('form1');
        const formElementGroup = EntityFactory.createFormElementGroup('foo', 1, form);
        form.addFormElementGroup(formElementGroup);

        formElementGroup.addFormElement(EntityFactory.createFormElement('one', false, EntityFactory.createConcept('one', Concept.dataType.Numeric), 1));
        formElementGroup.addFormElement(EntityFactory.createFormElement('two', false, EntityFactory.createConcept('two', Concept.dataType.Numeric), 2));
        formElementGroup.addFormElement(EntityFactory.createFormElement('three', false, EntityFactory.createConcept('three', Concept.dataType.Numeric), 3));
        formElementGroup.addFormElement(EntityFactory.createFormElement('four', false, EntityFactory.createConcept('four', Concept.dataType.Numeric), 4));

        const observationRules = [];
        observationRules.push(ObservationRule.create("one", {allowedOccurrences: 1, validTill: 12, validityBasedOn: 'foo'}));
        observationRules.push(ObservationRule.create("two", {}));
        observationRules.push(ObservationRule.create("three", {validFrom: 21}));
        observationRules.push(ObservationRule.create("four", {allowedOccurrences: 1}));

        const concept = EntityFactory.createConcept("foo", Concept.dataType.Date);
        const programEncounter = EntityFactory.createProgramEncounter({programEnrolment: EntityFactory.createProgramEnrolment({enrolmentDateTime: new Date(2016, 11, 30)}), encounterDateTime: new Date(2017, 0, 10),observations: [EntityFactory.createObservation(concept, new Date(2017, 0, 0))]});
        const applicableFormElements = formElementGroup.getApplicableFormElements(programEncounter, observationRules);
        expect(applicableFormElements.length).is.equal(3);
    });
});