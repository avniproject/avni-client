import AbstractDataEntryState from "./AbstractDataEntryState";
import _ from "lodash";
import Wizard from "./Wizard";
import {StaticFormElementGroup, ObservationsHolder, SubjectProgramEligibility} from 'avni-models';

class SubjectProgramEligibilityState extends AbstractDataEntryState {
    constructor(subjectProgramEligibility, validationResults, formElementGroup, wizard, filteredFormElements) {
        super(validationResults, formElementGroup, wizard, false, filteredFormElements);
        this.subjectProgramEligibility = subjectProgramEligibility;
    }

    get observationsHolder() {
        return new ObservationsHolder(this.subjectProgramEligibility.observations);
    }

    get staticFormElementIds() {
        return [];
    }

    static createOnLoad(subjectProgramEligibility, form, formElementGroup, filteredFormElements, formElementStatuses) {
        let indexOfGroup = _.findIndex(form.getFormElementGroups(), (feg) => feg.uuid === formElementGroup.uuid) + 1;
        let state = new SubjectProgramEligibilityState(subjectProgramEligibility, [], formElementGroup, new Wizard(form.numberOfPages, indexOfGroup, indexOfGroup), filteredFormElements);
        state.observationsHolder.updatePrimitiveCodedObs(filteredFormElements, formElementStatuses);
        return state;
    }

    static createOnLoadStateForEmptyForm(subjectProgramEligibility, form) {
        return new SubjectProgramEligibilityState(subjectProgramEligibility, [], new StaticFormElementGroup(form), new Wizard(1), []);
    }

    getEntity() {
        return this.subjectProgramEligibility;
    }

    getEntityType() {
        return SubjectProgramEligibility.schema.name;
    }

    clone() {
        const newState = new SubjectProgramEligibilityState();
        newState.subjectProgramEligibility = _.isNil(this.subjectProgramEligibility) ? this.subjectProgramEligibility : this.subjectProgramEligibility.cloneForEdit();
        super.clone(newState);
        return newState;
    }

    validateEntity(context) {
        return [];
    }

    getEffectiveDataEntryDate() {
        return this.subjectProgramEligibility.checkDate;
    }

    isEligible(subject, program, ruleEvaluationService) {
        return ruleEvaluationService.isManuallyEligibleForProgram(subject, program, this.subjectProgramEligibility);
    }
}

export default SubjectProgramEligibilityState;