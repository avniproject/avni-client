import AbstractDataEntryState from "../../state/AbstractDataEntryState";
import ProgramEnrolment from '../../models/ProgramEnrolment';
import _ from 'lodash';
import ObservationsHolder from "../../models/ObservationsHolder";
import Wizard from '../../state/Wizard';

class ProgramEnrolmentState extends AbstractDataEntryState {
    static UsageKeys = {
        Enrol: 'Enrol',
        Exit: 'Exit'
    };

    constructor(validationResults, formElementGroup, wizard, usage, enrolment, isNewEnrolment) {
        super(validationResults, formElementGroup, wizard, isNewEnrolment);
        this.usage = usage;
        this.enrolment = enrolment;
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

    static hasEnrolmentOrItsUsageChanged(state, action) {
        return _.isNil(state) ||
            _.isNil(state.enrolment) ||
            this.enrolment.uuid !== action.enrolment.uuid ||
            state.usage !== action.usage;
    }

    validateEntity() {
        return this.usage === ProgramEnrolmentState.UsageKeys.Enrol ? this.enrolment.validateEnrolment() : this.enrolment.validateExit();
    }

    validateEntityAgainstRule(ruleService) {
        return [];
    }

    executeRule(ruleService) {
        return [];
    }

    static isInitialised(programEnrolmentState) {
        return !_.isNil(programEnrolmentState.enrolment);
    }
}

export default ProgramEnrolmentState;