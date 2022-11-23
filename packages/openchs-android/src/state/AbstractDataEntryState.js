import _ from "lodash";
import RuleEvaluationService from "../service/RuleEvaluationService";
import {BaseEntity, SubjectType, ValidationResult, WorkItem, WorkLists} from "avni-models";
import General from "../utility/General";
import ObservationHolderActions from "../action/common/ObservationsHolderActions";
import SettingsService from "../service/SettingsService";
import Geo from "../framework/geo";
import UserInfoService from "../service/UserInfoService";
import WorkListState from "./WorkListState";
import moment from "moment/moment";
import Config from '../framework/Config';
import EntityService from "../service/EntityService";
import TimerState from "./TimerState";

class AbstractDataEntryState {
    locationError;

    constructor(validationResults, formElementGroup, wizard, isNewEntity, filteredFormElements, workLists, timerState, isFirstFlow) {
        this.setState(validationResults, formElementGroup, wizard, isNewEntity, filteredFormElements, {}, workLists, timerState, isFirstFlow);
    }

    clone(newState = new this.constructor()) {
        newState.validationResults = [];
        this.validationResults.forEach((validationResult) => {
            newState.validationResults.push(ValidationResult.clone(validationResult));
        });
        newState.formElementGroup = this.formElementGroup;
        newState.filteredFormElements = this.filteredFormElements;
        newState.wizard = _.isNil(this.wizard) ? this.wizard : this.wizard.clone();
        newState.formElementsUserState = this.formElementsUserState;
        newState.locationError = this.locationError;
        newState.workListState = this.workListState;
        newState.isNewEntity = this.isNewEntity;
        newState.timerState = _.isNil(this.timerState) ? this.timerState : this.timerState.clone();
        newState.isFirstFlow = this.isFirstFlow;
        return newState;
    }

    getWorkContext() {
        return {};
    }

    getEntity() {
        throw new Error("getEntity should be overridden");
    }

    getEntityType() {
        throw new Error("getEntityType should be overridden");
    }

    getEntityContext() {
        return {};
    }

    handleValidationResult(validationResult) {
        _.remove(this.validationResults, (existingValidationResult) => existingValidationResult.formIdentifier === validationResult.formIdentifier
            && existingValidationResult.questionGroupIndex === validationResult.questionGroupIndex);
        if (!validationResult.success) {
            this.validationResults.push(validationResult);
        }
    }

    removeHiddenFormValidationResults(hiddenFormElementStatus) {
        this.validationResults = _.differenceWith(this.validationResults, hiddenFormElementStatus, (a, b) => a.formIdentifier === b.uuid && a.questionGroupIndex === b.questionGroupIndex);
    }

    handleValidationResults(validationResults, context) {
        const settings = context.get(SettingsService).getSettings();
        if (!settings.devSkipValidation) {
            validationResults.forEach((validationResult) => {
                this.handleValidationResult(validationResult);
            });
        }
    }

    moveNext() {
        this.wizard.moveNext();
        this.formElementGroup = this.formElementGroup.next();
        if (this.isFirstFlow) {
            if (_.isNil(this.timerState)) {
                this.timerState = new TimerState(this.formElementGroup.startTime, this.formElementGroup.stayTime, !this.formElementGroup.timed);
            } else {
                this.timerState.resetForNextPage(this.formElementGroup);
            }
        }
    }

    movePrevious() {
        if (this.isFirstFlow && this.timerState) {
            if (this.timerState.isPreviousNotAllowed(this.formElementGroup)) return;
            else this.timerState.resetForPrevious();
        }
        this.wizard.movePrevious();
        this.formElementGroup = this.formElementGroup.previous();
    }

    get observationsHolder() {
        throw Error('observationsHolder Should be overridden');
    }

    get hasValidationError() {
        return this.validationResults.some((validationResult) => !validationResult.success);
    }

    removeNonRuleValidationErrors() {
        _.remove(this.validationResults, (validationResult) => validationResult.formIdentifier === BaseEntity.fieldKeys.EXTERNAL_RULE)
    }

    removeRuleValidationErrors() {
        _.remove(this.validationResults, (validationResult) => _.isEmpty(validationResult.formIdentifier))
    }

    handlePrevious(action, context) {
        this.movePrevious();

        ObservationHolderActions.updateFormElements(this.formElementGroup, this, context);
        this.observationsHolder.removeNonApplicableObs(this.formElementGroup.getFormElements(), this.filteredFormElements);

        if (this.hasNoFormElements() && !this.wizard.isFirstPage()) {
            General.logDebug("No form elements here. Moving to previous screen");
            return this.handlePrevious(action, context);
        }

        if (!(_.isNil(action) || _.isNil(action.cb)))
            action.cb(this);
        return this;
    }

    handleSummaryPage(action, context) {
        while (!this.wizard.isLastPage() && !this.anyFailedResultForCurrentFEG()) {
            this.handleNext(action, context);
        }
        // after the last page one more next to go to SR page
        if (this.wizard.isLastPage() && !this.anyFailedResultForCurrentFEG()) {
            this.handleNext(action, context);
        }
        return this;
    }

    handleNext(action, context) {
        const ruleService = context.get(RuleEvaluationService);
        const validationResults = this.validateEntity(context);
        const formElementGroupValidations = this.formElementGroup.validate(this.observationsHolder, this.filteredFormElements);
        const allValidationResults = _.unionWith(validationResults, formElementGroupValidations , (a,b) => a.formIdentifier === b.formIdentifier && a.questionGroupIndex === b.questionGroupIndex);
        const allRuleValidationResults  = _.unionWith(this.validationResults, allValidationResults, (a,b) => a.formIdentifier === b.formIdentifier && a.questionGroupIndex === b.questionGroupIndex);
        this.handleValidationResults(allRuleValidationResults, context);
        if(Config.ENV === "dev" && Config.goToLastPageOnNext) {
            while (!this.wizard.isLastPage()) {
                this.moveNext();
            }
        }
        if (this.anyFailedResultForCurrentFEG()) {
            if (!_.isNil(action.validationFailed)) action.validationFailed(this);
        } else if (!action.popVerificationVew && !_.isNil(action.phoneNumberObservation)) {
            action.verifyPhoneNumber(action.phoneNumberObservation);
        } else if (this.wizard.isLastPage()) {
            this.moveToLastPageWithFormElements(action, context);
            this.removeNonRuleValidationErrors();
            //remove the older rule validation error before validating the form again.
            this.removeRuleValidationErrors();
            const validationResults = this.validateEntityAgainstRule(ruleService);
            this.handleValidationResults(validationResults, context);
            let decisions, checklists, nextScheduledVisits;
            if (!ValidationResult.hasValidationError(this.validationResults)) {
                decisions = this.executeRule(ruleService, context);
                checklists = this.getChecklists(ruleService, context);
                nextScheduledVisits = this.getNextScheduledVisits(ruleService, context);
                this.workListState = new WorkListState(this.updateWorkLists(ruleService, this.workListState.workLists, nextScheduledVisits, context), () => this.getWorkContext());
            }
            action.completed(this, decisions, validationResults, checklists, nextScheduledVisits, context, action.fromSDV);
        } else {
            if (action.popVerificationVew)
                action.popVerificationVewFunc();
            this.moveNext();
            const formElementStatuses = ObservationHolderActions.updateFormElements(this.formElementGroup, this, context);
            this.observationsHolder.removeNonApplicableObs(this.formElementGroup.getFormElements(), this.filteredFormElements);
            this.observationsHolder.updatePrimitiveCodedObs(this.filteredFormElements, formElementStatuses);
            if (ObservationHolderActions.hasQuestionGroupWithValueInElementStatus(formElementStatuses, this.formElementGroup.getFormElements())) {
                ObservationHolderActions.updateFormElements(this.formElementGroup, this, context);
            }
            if (this.hasNoFormElements()) {
                General.logDebug("No form elements here. Moving to next screen");
                return this.handleNext(action, context);
            }
            if (_.isFunction(action.movedNext)) action.movedNext(this);
        }
        return this;
    }

    updateWorkLists(ruleService, oldWorkLists, nextScheduledVisits, context) {
        if (_.isNil(oldWorkLists))
            return null;
        let workLists = oldWorkLists;
        let currentWorkItem = workLists.getCurrentWorkItem();
        if (currentWorkItem.type === WorkItem.type.REGISTRATION) {
            const subjectType = context.get(EntityService).findByKey('name', currentWorkItem.parameters.subjectTypeName, SubjectType.schema.name);
            if (subjectType.isHousehold()) {
                workLists = this._addItemsToWorkList(workLists);
            }
        }
        if (!_.isEmpty(nextScheduledVisits)) {
            workLists = this._addNextScheduledVisitToWorkList(workLists, nextScheduledVisits);
        }

        if (!workLists.peekNextWorkItem()) {
            if (currentWorkItem.type === WorkItem.type.REGISTRATION) {
                workLists.addItemsToCurrentWorkList(new WorkItem(General.randomUUID(), WorkItem.type.REGISTRATION, {subjectTypeName: currentWorkItem.parameters.subjectTypeName}));
            } else if (currentWorkItem.type === WorkItem.type.ADD_MEMBER) {
                workLists.addItemsToCurrentWorkList(new WorkItem(General.randomUUID(), WorkItem.type.ADD_MEMBER, {...currentWorkItem.parameters}));
            }
        }

        return ruleService.updateWorkLists(workLists, {entity: this.getEntity()}, this.getEntityType());
    }

    _addItemsToWorkList(workLists) {
        const {totalMembers, subjectUUID} = this.getWorkContext();
        let householdItemsInWorkList = 1;
        while (householdItemsInWorkList < totalMembers) {
            householdItemsInWorkList += 1;
            workLists.addItemsToCurrentWorkList(new WorkItem(General.randomUUID(), WorkItem.type.HOUSEHOLD, {
                saveAndProceedLabel: 'saveAndAddMember',
                household: `${householdItemsInWorkList} of ${totalMembers}`,
                headOfHousehold: false,
                currentMember: householdItemsInWorkList,
                groupSubjectUUID: subjectUUID,
                message: 'newMemberAddedMsg',
                totalMembers,
            }));
        }
        return workLists;
    }

    _addNextScheduledVisitToWorkList(workLists: WorkLists, nextScheduledVisits): WorkLists {
        if (_.isEmpty(nextScheduledVisits)) return workLists;

        const applicableScheduledVisits = _.filter(nextScheduledVisits, (visit) => {
            return moment().isBetween(visit.earliestDate, visit.maxDate, 'day', '[]');
        });
        const getProgramUUIDFromVisit = (visit) => visit.programEnrolment && visit.programEnrolment.uuid || undefined;
        _.forEach(applicableScheduledVisits, (applicableScheduledVisit) => {
            const parameters = _.merge({}, this.getWorkContext(), applicableScheduledVisit, {programEnrolmentUUID: getProgramUUIDFromVisit(applicableScheduledVisit)});
            const sameVisitTypeExists = workLists.currentWorkList.workItems.find(
                    (workItem) => {
                        const {programEnrolmentUUID, encounterType} = workItem.parameters;
                        return programEnrolmentUUID === parameters.programEnrolmentUUID && encounterType === parameters.encounterType;
                    });
            if (sameVisitTypeExists) return;
            const workItemType = WorkItem.type[parameters.programEnrolmentUUID? 'PROGRAM_ENCOUNTER' : 'ENCOUNTER'];
            workLists.addItemsToCurrentWorkList(new WorkItem(General.randomUUID(), workItemType, parameters));
        });
        return workLists;
    }

    moveToLastPageWithFormElements(action, context) {
        while (this.hasNoFormElements() && !this.wizard.isFirstPage()) {
            this.handlePrevious(action, context);
        }
    }

    validateEntityAgainstRule(ruleService) {
        return [];
    }

    executeRule(ruleService, context) {
        return {enrolmentDecisions: [], encounterDecisions: [], registrationDecisions: []};
    }

    getChecklists(ruleService, context) {
        return null;
    }

    validateEntity(context) {
        throw Error('validateEntity Should be overridden');
    }

    static getValidationError(state, formElementIdentifier) {
        return _.find(state.validationResults, (validationResult) => validationResult.formIdentifier === formElementIdentifier);
    }

    static hasValidationError(state, formElementIdentifier) {
        const validationError = AbstractDataEntryState.getValidationError(state, formElementIdentifier);
        return !_.isNil(validationError);
    }

    anyFailedResultForCurrentFEG() {
        const formUUIDs = _.union(this.formElementGroup.formElementIds, this.staticFormElementIds);
        return _.some(this.validationResults, (validationResult) => {
            return validationResult.success === false && formUUIDs.indexOf(validationResult.formIdentifier) !== -1;
        });
    }

    get staticFormElementIds() {
        return [];
    }

    setState(validationResults, formElementGroup, wizard, isNewEntity, filteredFormElements, formElementsUserState, workLists, timerSate, isFirstFlow) {
        this.validationResults = validationResults;
        this.formElementGroup = formElementGroup;
        this.wizard = wizard;
        this.isNewEntity = isNewEntity;
        this.filteredFormElements = filteredFormElements;
        this.formElementsUserState = formElementsUserState;
        this.workListState = new WorkListState(workLists, () => this.getWorkContext());
        this.timerState = timerSate;
        this.isFirstFlow = isFirstFlow;
    }

    hasNoFormElements() {
        return _.isEmpty(this.filteredFormElements);
    }


    getNextScheduledVisits(ruleService, context) {
        return null;
    }

    getEffectiveDataEntryDate() {
        throw Error('This method should be overridden');
    }

    validateLocation(location, validationKey, context) {
        const userInfoService = context.get(UserInfoService);
        const settings = userInfoService.getUserSettings();
        if (settings.trackLocation !== true || !_.isNil(location) || _.isNil(this.locationError)) {
            return ValidationResult.successful(validationKey);
        }
        switch (this.locationError.code) {
            case Geo.ErrorCodes.SETTINGS_NOT_SATISFIED:
            case Geo.ErrorCodes.PERMISSION_DENIED:
                return ValidationResult.failure(validationKey, "giveLocationPermissions");
            case Geo.ErrorCodes.PERMISSION_NEVER_ASK_AGAIN:
                return ValidationResult.failure(validationKey, "giveLocationPermissionFromSettings");
            default:
                return ValidationResult.successful(validationKey);
        }
    }

    getEntityResultSetByType(context) {
        return []
    }
}

export default AbstractDataEntryState;
