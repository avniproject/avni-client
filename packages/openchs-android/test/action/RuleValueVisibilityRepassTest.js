/**
 * avni-client#2182 — a question whose visibility depends on a value that a rule sets must show in the
 * same update, not on the user's next interaction.
 *
 * Form: Date of birth (entered) -> Age (value set by a rule from the date) -> Adult question (shown
 * only when Age >= 18). Setting the date must show the Adult question at once.
 */
import {Concept, FormElementStatus, ObservationsHolder} from 'avni-models';
import _ from 'lodash';
import moment from 'moment';
import ObservationsHolderActions from '../../src/action/common/ObservationsHolderActions';
import RuleEvaluationService from '../../src/service/RuleEvaluationService';
import Wizard from '../../src/state/Wizard';
import ProgramEncounterState from '../../src/state/ProgramEncounterState';
import EntityFactory from '../EntityFactory';
import StubbedDataEntryState from './StubbedDataEntryState';
import TestContext from './views/testframework/TestContext';

const valueOf = (observationsHolder, concept) => {
    const obs = observationsHolder.findObservation(concept);
    return obs ? obs.getValue() : null;
};

// Stands in for the form's rules: Age's value comes from Date of birth; Adult question shows when Age >= 18.
class AgeRuleService {
    constructor(dob, age, adult) {
        Object.assign(this, {dob, age, adult, passes: 0});
    }

    getFormElementsStatuses(entity, entityType, formElementGroup) {
        this.passes++;
        const holder = new ObservationsHolder(entity.observations);
        const dobValue = valueOf(holder, this.dob.concept);
        const ageValue = valueOf(holder, this.age.concept);
        return formElementGroup.getFormElements().map(fe => {
            if (fe.uuid === this.age.uuid) {
                return new FormElementStatus(fe.uuid, true, dobValue ? moment().diff(dobValue, 'years') : undefined);
            }
            if (fe.uuid === this.adult.uuid) {
                return new FormElementStatus(fe.uuid, !_.isNil(ageValue) && ageValue >= 18, undefined);
            }
            return new FormElementStatus(fe.uuid, true, undefined);
        });
    }
}

const contextWith = (ruleService) => {
    const testContext = new TestContext();
    return {get: (cls) => cls === RuleEvaluationService ? ruleService : testContext.get(cls), getService: (cls) => testContext.getService(cls)};
};

const buildForm = () => {
    const form = EntityFactory.createForm('f');
    const feg = EntityFactory.createFormElementGroup('page 1', 1, form);
    const dob = EntityFactory.createFormElement('Date of birth', false, EntityFactory.createConcept('Date of birth', Concept.dataType.Date), 1);
    const age = EntityFactory.createFormElement('Age', false, EntityFactory.createConcept('Age', Concept.dataType.Numeric), 2);
    const adult = EntityFactory.createFormElement('Adult question', false, EntityFactory.createConcept('Adult question', Concept.dataType.Text), 3);
    [dob, age, adult].forEach(fe => feg.addFormElement(fe));
    return {form, feg, dob, age, adult};
};

describe('Rule-set values re-evaluate visibility in the same update (#2182)', () => {
    it('shows the dependent question as soon as the date is entered', () => {
        const {feg, dob, age, adult} = buildForm();
        const ruleService = new AgeRuleService(dob, age, adult);
        const state = new StubbedDataEntryState([], feg, new Wizard(1, 1), [], null);
        state.filteredFormElements = [dob, age];

        const newState = ObservationsHolderActions.onPrimitiveObsUpdateValue(state,
            {formElement: dob, value: moment().subtract(30, 'years').toDate()}, contextWith(ruleService));

        expect(valueOf(newState.observationsHolder, age.concept)).toBe(30);
        expect(newState.filteredFormElements.map(fe => fe.name)).toContain('Adult question');
    });

    it('hides the dependent question as soon as the date makes the rule value fall below the threshold', () => {
        const {feg, dob, age, adult} = buildForm();
        const ruleService = new AgeRuleService(dob, age, adult);
        const state = new StubbedDataEntryState([], feg, new Wizard(1, 1), [], null);
        const context = contextWith(ruleService);
        const adultState = ObservationsHolderActions.onPrimitiveObsUpdateValue(state,
            {formElement: dob, value: moment().subtract(30, 'years').toDate()}, context);

        const childState = ObservationsHolderActions.onPrimitiveObsUpdateValue(adultState,
            {formElement: dob, value: moment().subtract(5, 'years').toDate()}, context);

        expect(valueOf(childState.observationsHolder, age.concept)).toBe(5);
        expect(childState.filteredFormElements.map(fe => fe.name)).not.toContain('Adult question');
    });

    it('runs no extra pass when no rule changed a value', () => {
        const {feg, dob, age, adult} = buildForm();
        const ruleService = new AgeRuleService(dob, age, adult);
        const state = new StubbedDataEntryState([], feg, new Wizard(1, 1), [], null);
        const context = contextWith(ruleService);
        const settled = ObservationsHolderActions.onPrimitiveObsUpdateValue(state,
            {formElement: dob, value: moment().subtract(30, 'years').toDate()}, context);

        ruleService.passes = 0;
        ObservationsHolderActions.onPrimitiveObsUpdateValue(settled, {formElement: adult, value: 'some text'}, context);

        expect(ruleService.passes).toBe(1);
    });

    it('stops after a bounded number of extra passes when a rule keeps changing its value', () => {
        const {feg, dob, age, adult} = buildForm();
        let counter = 0;
        const ruleService = {
            passes: 0,
            getFormElementsStatuses(entity, entityType, formElementGroup) {
                this.passes++;
                return formElementGroup.getFormElements().map(fe =>
                    new FormElementStatus(fe.uuid, true, fe.uuid === age.uuid ? ++counter : undefined));
            }
        };
        const state = new StubbedDataEntryState([], feg, new Wizard(1, 1), [], null);

        ObservationsHolderActions.onPrimitiveObsUpdateValue(state, {formElement: dob, value: new Date()}, contextWith(ruleService));

        expect(ruleService.passes).toBe(1 + ObservationsHolderActions.MAX_RULE_VALUE_REPASSES);
    });

    it('shows the dependent question when a visit opens with the date already filled (the reported case)', () => {
        const {form, feg, dob, age, adult} = buildForm();
        const ruleService = new AgeRuleService(dob, age, adult);
        const programEncounter = EntityFactory.createProgramEncounter({});
        programEncounter.observations = [];
        new ObservationsHolder(programEncounter.observations).addOrUpdatePrimitiveObs(dob.concept, moment().subtract(30, 'years').toDate());
        const formElementStatuses = ruleService.getFormElementsStatuses(programEncounter, 'ProgramEncounter', feg);
        const filteredFormElements = feg.filterElements(formElementStatuses);

        const state = ProgramEncounterState.createOnLoad(programEncounter, form, true, feg, filteredFormElements, formElementStatuses,
            null, false, contextWith(ruleService), false);

        expect(valueOf(state.observationsHolder, age.concept)).toBe(30);
        expect(state.filteredFormElements.map(fe => fe.name)).toContain('Adult question');
    });
});
