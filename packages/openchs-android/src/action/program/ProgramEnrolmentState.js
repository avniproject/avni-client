import AbstractDataEntryState from "../../state/AbstractDataEntryState";
import {ProgramEnrolment, ObservationsHolder} from 'openchs-models';
import _ from 'lodash';
import ConceptService from "../../service/ConceptService";

class ProgramEnrolmentState extends AbstractDataEntryState {
    static UsageKeys = {
        Enrol: 'Enrol',
        Exit: 'Exit'
    };

    constructor(validationResults, formElementGroup, wizard, usage, enrolment, isNewEnrolment, filteredFormElements) {
        super(validationResults, formElementGroup, wizard, isNewEnrolment, filteredFormElements);
        this.usage = usage;
        this.enrolment = enrolment;
        this.formElementsUserState = {};
        if (!_.isNil(enrolment))
            this.applicableObservationsHolder = new ObservationsHolder(ProgramEnrolmentState.UsageKeys.Enrol ? enrolment.observations : enrolment.programExitObservations);
    }

    getEntity() {
        return this.enrolment;
    }

    getEntityType() {
        return ProgramEnrolment.schema.name;
    }

    clone() {
        const newState = new ProgramEnrolmentState();
        super.clone(newState);
        newState.enrolment = this.enrolment.cloneForEdit();
        newState.newEnrolment = this.newEnrolment;
        newState.usage = this.usage;
        newState.applicableObservationsHolder = new ObservationsHolder(ProgramEnrolmentState.UsageKeys.Enrol ? newState.enrolment.observations : newState.enrolment.programExitObservations);
        newState.formElementsUserState = this.formElementsUserState;
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
        return ruleService.validateAgainstRule(this.enrolment, this.formElementGroup.form, ProgramEnrolment.schema.name);
    }

    executeRule(ruleService, context) {
        let decisions = ruleService.getDecisions(this.enrolment, ProgramEnrolment.schema.name);
        if (this.usage === ProgramEnrolmentState.UsageKeys.Enrol) {
            context.get(ConceptService).addDecisions(this.enrolment.observations, decisions.enrolmentDecisions);
        } else {
            context.get(ConceptService).addDecisions(this.enrolment.programExitObservations, decisions.enrolmentDecisions);
        }

        return decisions;
    }

    getChecklists(ruleService, context) {
        if (this.usage === ProgramEnrolmentState.UsageKeys.Enrol) {
            const ruleChecklists = ruleService.getChecklists(this.enrolment);
            return this.enrolment.createChecklists(ruleChecklists, context.get(ConceptService));
        } else {
            return null;
        }
    }

    getNextScheduledVisits(ruleService, context) {
        return this.usage === ProgramEnrolmentState.UsageKeys.Enrol ? ruleService.getNextScheduledVisits(this.enrolment, ProgramEnrolment.schema.name) : null;
    }

    static isInitialised(programEnrolmentState) {
        return !_.isNil(programEnrolmentState.enrolment);
    }
}

export default ProgramEnrolmentState;