import {assert} from "chai";
import EntityFactory from "../EntityFactory";
import Concept from '../../src/Concept';
import ObservationRule from "../../src/observation/ObservationRule";

describe('FormElementGroupTest', () => {
    it('previous and next', () => {
        const form = EntityFactory.createForm('form1');
        const first = EntityFactory.createFormElementGroup('foo', 1, form);
        form.addFormElementGroup(first);
        const second = EntityFactory.createFormElementGroup('bar', 2, form);
        form.addFormElementGroup(second);
        const third = EntityFactory.createFormElementGroup('baz', 3, form);
        form.addFormElementGroup(third);

        assert.notEqual(first.next(), undefined);
        assert.notEqual(second.next(),undefined);
        assert.equal(third.next(),undefined);

        assert.equal(first.previous(), undefined);
        assert.notEqual(third.previous(), undefined);
        assert.notEqual(second.previous(), undefined);

        assert.equal(first.isFirst, true);
        assert.equal(second.isFirst, false);
    });

    it('getFormElements', () => {
        const form = EntityFactory.createForm('form1');
        const formElementGroup = EntityFactory.createFormElementGroup('foo', 1, form);
        formElementGroup.addFormElement(EntityFactory.createFormElement("bar", false, EntityFactory.createConcept("bar", Concept.dataType.Text), 2));
        formElementGroup.addFormElement(EntityFactory.createFormElement("baz", false, EntityFactory.createConcept("bar", Concept.dataType.Text), 1));
        assert.equal(formElementGroup.getFormElements().length, 2);
    });

    it('getApplicableFormElements', () => {
        const form = EntityFactory.createForm('form1');
        const formElementGroup = EntityFactory.createFormElementGroup('foo', 1, form);
        form.addFormElementGroup(formElementGroup);

        formElementGroup.addFormElement(EntityFactory.createFormElement('one', false, EntityFactory.createConcept('one', Concept.dataType.Numeric), 1));
        formElementGroup.addFormElement(EntityFactory.createFormElement('two', false, EntityFactory.createConcept('two', Concept.dataType.Numeric), 2));
        formElementGroup.addFormElement(EntityFactory.createFormElement('three', false, EntityFactory.createConcept('three', Concept.dataType.Numeric), 3));
        const concept4 = EntityFactory.createConcept('four', Concept.dataType.Numeric);
        formElementGroup.addFormElement(EntityFactory.createFormElement('four', false, concept4, 4));

        const concept = EntityFactory.createConcept("foo", Concept.dataType.Date);

        const observationRules = [];
        observationRules.push(ObservationRule.create("one", {allowedOccurrences: 1, validTill: 12, validityBasedOn: 'foo'}));
        observationRules.push(ObservationRule.create("two", {validityBasedOn: 'foo'}));
        observationRules.push(ObservationRule.create("three", {validFrom: 21, validityBasedOn: 'foo'}));
        observationRules.push(ObservationRule.create("four", {allowedOccurrences: 1, validityBasedOn: 'foo'}));

        let createProgramEnrolment = function() {
            return EntityFactory.createEnrolment({enrolmentDateTime: new Date(2017, 1, 0), observations: [EntityFactory.createObservation(concept, new Date(2017, 0, 0))]});
        };

        let getApplicableFormElementFor = function ({encounterDate = null, enrolment = createProgramEnrolment()}) {
            let programEncounter = EntityFactory.createProgramEncounter({
                programEnrolment: enrolment,
                encounterDateTime: encounterDate
            });
            enrolment.addEncounter(programEncounter);
            return formElementGroup.getApplicableFormElements(programEncounter, observationRules);
        };

        let applicableFormElements = getApplicableFormElementFor({encounterDate: new Date(2017, 0, 10)});
        assert.equal(applicableFormElements.length, 1 + 1 + 0 + 1);

        applicableFormElements = getApplicableFormElementFor({encounterDate: new Date(2017, 3, 10)});
        assert.equal(applicableFormElements.length, 0 + 1 + 0 + 1);

        applicableFormElements = getApplicableFormElementFor({encounterDate: new Date(2017, 6, 10)});
        assert.equal(applicableFormElements.length, 0 + 1 + 1 + 1);

        var programEnrolment = createProgramEnrolment();
        var existingEncounter = EntityFactory.createProgramEncounter({
            programEnrolment: programEnrolment,
            encounterDateTime: new Date(2017, 1, 15),
            observations: [EntityFactory.createObservation(concept4, 1)]
        });
        programEnrolment.addEncounter(existingEncounter);
        applicableFormElements = getApplicableFormElementFor({encounterDate: new Date(2017, 6, 10), enrolment: programEnrolment});
        assert.equal(applicableFormElements.length, 0 + 1 + 1 + 0);

        programEnrolment = createProgramEnrolment();
        var editedEncounter = EntityFactory.createProgramEncounter({
            programEnrolment: programEnrolment,
            encounterDateTime: new Date(2017, 1, 15),
            observations: [EntityFactory.createObservation(concept4, 1)]
        });
        programEnrolment.addEncounter(editedEncounter);
        applicableFormElements = formElementGroup.getApplicableFormElements(editedEncounter, observationRules);
        assert.equal(applicableFormElements.length, 0 + 1 + 1 + 1);
    });
});