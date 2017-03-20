import AbstractDataEntryState from "../../state/AbstractDataEntryState";
import ProgramEnrolment from '../../models/ProgramEnrolment';
import _ from 'lodash';
import ObservationsHolder from "../../models/ObservationsHolder";

class ProgramEnrolmentState extends AbstractDataEntryState {
    static UsageKeys = {
        Enrol: 'Enrol',
        Exit: 'Exit'
    };

    static empty() {
        return new ProgramEnrolmentState([], null, null, ProgramEnrolmentState.UsageKeys.Enrol, null, null);
    }

    constructor(validationResults, formElementGroup, wizard, usage, enrolment, isNewEnrolment) {
        super(validationResults, formElementGroup, wizard);
        this.usage = usage;
        this.enrolment = enrolment;
        this.newEnrolment = isNewEnrolment;
        if (!_.isNil(enrolment))
            this.applicableObservationsHolder = new ObservationsHolder(ProgramEnrolmentState.UsageKeys.Enrol ? enrolment.observations : enrolment.programExitObservations);
    }

    clone() {
        const newState = new ProgramEnrolmentState();
        super.clone(newState);
        newState.enrolment = this.enrolment.cloneForEdit();
        newState.newEnrolment = this.newEnrolment;
        newState.usage = this.usage;
        newState.applicableObservationsHolder = new ObservationsHolder(ProgramEnrolmentState.UsageKeys.Enrol ? newState.enrolment.observations : newState.enrolment.programExitObservations);
        return newState;
    }

    get observationsHolder() {
        return this.applicableObservationsHolder;
    }

    get staticFormElementIds() {
        const validationKey = this.usage === ProgramEnrolmentState.UsageKeys.Enrol ? ProgramEnrolment.validationKeys.ENROLMENT_DATE : ProgramEnrolment.validationKeys.EXIT_DATE;
        return this.wizard.isFirstPage() ? [validationKey] : [];
    }

    hasEnrolmentChanged(action) {
        return _.isNil(this.enrolment) ? true : this.enrolment.uuid !== action.enrolment.uuid;
    }

    reset() {
        super.reset();
        this.enrolment = null;
    }

    validateEntity() {
        return this.usage === ProgramEnrolmentState.UsageKeys.Enrol ? this.enrolment.validateEnrolment() : this.enrolment.validateExit();
    }
}

export default ProgramEnrolmentState;