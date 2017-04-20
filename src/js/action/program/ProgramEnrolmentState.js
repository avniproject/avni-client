import AbstractDataEntryState from "../../state/AbstractDataEntryState";
import ProgramEnrolment from '../../models/ProgramEnrolment';
import _ from 'lodash';
import ObservationsHolder from "../../models/ObservationsHolder";
import Wizard from '../../state/Wizard';
import ConceptService from "../../service/ConceptService";

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
            state.enrolment.uuid !== action.enrolment.uuid ||
            state.usage !== action.usage;
    }

    validateEntity() {
        return this.usage === ProgramEnrolmentState.UsageKeys.Enrol ? this.enrolment.validateEnrolment() : this.enrolment.validateExit();
    }

    validateEntityAgainstRule(ruleService) {
        return ruleService.validateAgainstRule(this.enrolment, this.formElementGroup.form, 'ProgramEnrolment');
    }

    executeRule(ruleService, context) {
        const decisions = ruleService.getDecisions(this.enrolment, 'ProgramEnrolment');
        context.get(ConceptService).addDecisions(this.enrolment.observations, decisions);
        return decisions;
    }

    static isInitialised(programEnrolmentState) {
        return !_.isNil(programEnrolmentState.enrolment);
    }
}

export default ProgramEnrolmentState;