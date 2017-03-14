import AbstractDataEntryState from "../../state/AbstractDataEntryState";
import ProgramEnrolment from '../../models/ProgramEnrolment';
import _ from 'lodash';

class ProgramEnrolmentState extends AbstractDataEntryState {
    static empty() {
        return new ProgramEnrolmentState([], null, null);
    }

    constructor(validationResults, formElementGroup, wizard) {
        super(validationResults, formElementGroup, wizard);
    }

    clone() {
        const newState = new ProgramEnrolmentState();
        super.clone(newState);
        newState.enrolment = this.enrolment.cloneForEdit();
        newState.newEnrolment = this.newEnrolment;
        return newState;
    }

    get observationsHolder() {
        return this.enrolment;
    }

    get staticFormElementIds() {
        return this.wizard.isFirstPage() ? [ProgramEnrolment.validationKeys.ENROLMENT_DATE] : [];
    }

    hasEnrolmentChanged(action) {
        return _.isNil(this.enrolment) ? true : this.enrolment.uuid !== action.enrolment.uuid;
    }

    reset() {
        super.reset();
        this.enrolment = null;
    }
}

export default ProgramEnrolmentState;