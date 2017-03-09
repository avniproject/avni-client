import AbstractDataEntryState from "../../state/AbstractDataEntryState";
import ProgramEnrolment from '../../models/ProgramEnrolment';

class ProgramEnrolmentState extends AbstractDataEntryState {
    constructor(validationResults, formElementGroup, wizard) {
        super(validationResults, formElementGroup, wizard);
    }

    clone() {
        const newState = new ProgramEnrolmentState();
        super.clone(newState);
        newState.enrolment = this.enrolment.cloneForEdit();
        return newState;
    }

    get observationsHolder() {
        return this.enrolment;
    }

    get staticFormElementIds() {
        return this.wizard.isFirstPage() ? [ProgramEnrolment.validationKeys.ENROLMENT_DATE] : [];
    }
}

export default ProgramEnrolmentState;