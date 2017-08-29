import {expect} from "chai";
import EntityFactory from "../EntityFactory";
import ProgramEncounter from "../../../js/models/ProgramEncounter";
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
        const concept4 = EntityFactory.createConcept('four', Concept.dataType.Numeric);
        formElementGroup.addFormElement(EntityFactory.createFormElement('four', false, concept4, 4));

        const concept = EntityFactory.createConcept("foo", Concept.dataType.Date);
        const programEnrolment = EntityFactory.createProgramEnrolment({enrolmentDateTime: new Date(2017, 1, 0)});

        const observationRules = [];
        observationRules.push(ObservationRule.create("one", {allowedOccurrences: 1, validTill: 12, validityBasedOn: 'foo'}));
        observationRules.push(ObservationRule.create("two", {validityBasedOn: 'foo'}));
        observationRules.push(ObservationRule.create("three", {validFrom: 21, validityBasedOn: 'foo'}));
        observationRules.push(ObservationRule.create("four", {allowedOccurrences: 1, validityBasedOn: 'foo'}));

        let getApplicableFormElementFor = function ({baseObservation = null, encounterDate = null}) {
            let programEncounter = EntityFactory.createProgramEncounter({
                programEnrolment: programEnrolment,
                encounterDateTime: encounterDate,
                observations: [EntityFactory.createObservation(concept, baseObservation)]
            });
            return formElementGroup.getApplicableFormElements(programEncounter, observationRules);
        };

        let applicableFormElements = getApplicableFormElementFor({baseObservation: new Date(2017, 0, 0), encounterDate: new Date(2017, 0, 10)});
        expect(applicableFormElements.length).is.equal(1 + 1 + 0 + 1);

        applicableFormElements = getApplicableFormElementFor({baseObservation: new Date(2017, 0, 0), encounterDate: new Date(2017, 3, 10)});
        expect(applicableFormElements.length).is.equal(0 + 1 + 0 + 1);

        applicableFormElements = getApplicableFormElementFor({baseObservation: new Date(2017, 0, 0), encounterDate: new Date(2017, 6, 10)});
        expect(applicableFormElements.length).is.equal(0 + 1 + 1 + 1);

        const oldEncounter = ProgramEncounter.createEmptyInstance();
        oldEncounter.encounterDate = new Date(2017, 1, 15);
        oldEncounter.addObservation(EntityFactory.createObservation(concept4, 1));
        programEnrolment.addEncounter(oldEncounter);

        applicableFormElements = getApplicableFormElementFor({baseObservation: new Date(2017, 0, 0), encounterDate: new Date(2017, 6, 10)});
        expect(applicableFormElements.length).is.equal(0 + 1 + 1 + 0);
    });
});