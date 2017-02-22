import AbstractDataEntryState from "../../state/AbstractDataEntryState";

class ProgramEnrolmentState extends AbstractDataEntryState {
    constructor() {
        super();
        this.enrolment = null;
    }

    clone() {
        const newState = new ProgramEnrolmentState();
        super.clone(newState);
        newState.enrolment = this.enrolment.cloneForEdit();
        return newState;
    }
}

export default ProgramEnrolmentState;