import _ from "lodash";
import {Encounter, Individual, Privilege, ProgramEncounter, ProgramEnrolment, WorkItem, WorkList, WorkLists} from "avni-models";
import CHSNavigator from "../../utility/CHSNavigator";
import General from "../../utility/General";
import {firebaseEvents, logEvent} from "../../utility/Analytics";
import {RETURN_TO_SOURCE} from "../../utility/ReturnToSource";
import EntityService from "../EntityService";
import FormMappingService from "../FormMappingService";
import PrivilegeService from "../PrivilegeService";
import RuleEvaluationService from "../RuleEvaluationService";

// Commands a Custom Design Card page can send to open, edit or start a record. Plain functions: the command service
// calls them with itself, the page's arguments and a page handle. Order in every resolver: the record, then the
// user's right to see it, then the checks the profile runs for that action, then the navigation. Every check
// finishes before an outcome with `navigate` is returned.

export const MessageKeys = {
    notOnPhone: 'recordNotOnThisPhone',
    noPermission: 'noPermissionForThisAction',
    notAvailable: 'customCardActionNotAvailable',
};

export const TAB_NUMBERS = {profile: 1, program: 2, general: 3};

const SAFE_ID = /^[A-Za-z0-9_-]{1,255}$/;
const notOnPhone = () => ({message: MessageKeys.notOnPhone});
const isLive = (record) => record != null && record.voided !== true;

// The lookup puts the id into its query as is, so anything but a plain id never reaches it. A collection has no uuid.
const findLiveRecord = (getService, uuid, schemaName) => {
    if (typeof uuid !== 'string' || !SAFE_ID.test(uuid)) return null;
    const record = getService(EntityService).findByUUID(uuid, schemaName);
    return record != null && record.uuid === uuid && isLive(record) ? record : null;
};

export const findLiveSubject = (getService, uuid) => findLiveRecord(getService, uuid, Individual.schema.name);

export const findLiveEnrolment = (getService, uuid) => {
    const enrolment = findLiveRecord(getService, uuid, ProgramEnrolment.schema.name);
    if (enrolment == null) return null;
    // The reference on the child is not trusted: a missing parent comes back as {uuid}.
    const subject = findLiveSubject(getService, enrolment.individual && enrolment.individual.uuid);
    return subject == null ? null : {enrolment, subject};
};

export const findLiveVisit = (getService, uuid) => {
    const generalVisit = findLiveRecord(getService, uuid, Encounter.schema.name);
    if (generalVisit != null) {
        const subject = findLiveSubject(getService, generalVisit.individual && generalVisit.individual.uuid);
        return subject == null ? null : {visit: generalVisit, isProgramVisit: false, subject, enrolment: null};
    }
    const programVisit = findLiveRecord(getService, uuid, ProgramEncounter.schema.name);
    if (programVisit == null) return null;
    const found = findLiveEnrolment(getService, programVisit.programEnrolment && programVisit.programEnrolment.uuid);
    return found == null ? null : {visit: programVisit, isProgramVisit: true, subject: found.subject, enrolment: found.enrolment};
};

export const canViewSubject = (getService, subjectType) => {
    const privilegeService = getService(PrivilegeService);
    if (privilegeService.hasAllPrivileges()) return true;
    const criteria = `privilege.name = '${Privilege.privilegeName.viewSubject}' AND privilege.entityType = '${Privilege.privilegeEntityType.subject}'`;
    const allowed = privilegeService.allowedEntityTypeUUIDListForCriteria(criteria, 'subjectTypeUuid');
    return subjectType != null && _.includes(allowed, subjectType.uuid);
};

const openOutcome = (getService, subject, enrolmentUUID, tab) => {
    if (!canViewSubject(getService, subject.subjectType)) return {message: MessageKeys.noPermission};
    return {navigate: view => CHSNavigator.navigateToProgramEnrolmentDashboardView(view, subject.uuid, enrolmentUUID, false, null, null, tab)};
};

export const resolveOpenSubject = (getService, args) => {
    const {subjectUUID, tab} = args || {};
    const noTab = _.isNil(tab);
    if (!noTab && !(typeof tab === 'string' && Object.prototype.hasOwnProperty.call(TAB_NUMBERS, tab))) return {message: MessageKeys.notAvailable};
    const subject = findLiveSubject(getService, subjectUUID);
    if (subject == null) return notOnPhone();
    if (!canViewSubject(getService, subject.subjectType)) return {message: MessageKeys.noPermission};
    if (noTab) return {navigate: view => CHSNavigator.navigateToProgramEnrolmentDashboardView(view, subject.uuid)};
    return {navigate: view => CHSNavigator.navigateToProgramEnrolmentDashboardView(view, subject.uuid, null, false, null, null, TAB_NUMBERS[tab])};
};

export const resolveOpenEnrolment = (getService, args) => {
    const found = findLiveEnrolment(getService, (args || {}).enrolmentUUID);
    if (found == null) return notOnPhone();
    return openOutcome(getService, found.subject, found.enrolment.uuid, TAB_NUMBERS.program);
};

export const resolveOpenVisit = (getService, args) => {
    const found = findLiveVisit(getService, (args || {}).visitUUID);
    if (found == null) return notOnPhone();
    return found.isProgramVisit
        ? openOutcome(getService, found.subject, found.enrolment.uuid, TAB_NUMBERS.program)
        : openOutcome(getService, found.subject, null, TAB_NUMBERS.general);
};

// Null when the form's edit rule allows the edit. Otherwise the rule's own message, which the page shows as the
// profile does, or the no-permission message when the rule gives none, so the message is never blank.
export const editRuleMessage = (getService, form, entity, entityName) => {
    const response = getService(RuleEvaluationService).runEditFormRule(form, entity, entityName);
    if (response.isAllowed()) return null;
    const message = response.getMessage();
    return _.isString(message) && _.trim(message) !== '' ? message : MessageKeys.noPermission;
};

// The checks after the view right, in order: the edit right, a form, then the form's edit rule. The rule reads the
// form with no null check, so the form is checked first. Null when the edit may go ahead.
const editRefusal = (getService, {criteria, privilegeParam, findForm, entity, entityName}) => {
    if (!getService(PrivilegeService).hasActionPrivilegeForCriteria(criteria, privilegeParam)) return {message: MessageKeys.noPermission};
    const form = findForm(getService(FormMappingService));
    if (_.isNil(form)) return {message: MessageKeys.notAvailable};
    const ruleMessage = editRuleMessage(getService, form, entity, entityName);
    return ruleMessage == null ? null : {message: ruleMessage};
};

// One work list holding one work item, as the profile builds it, flagged so its save comes back to the card page.
const editWorkLists = (listName, itemType, parameters) =>
    new WorkLists(new WorkList(listName, [new WorkItem(General.randomUUID(), itemType, {...parameters, [RETURN_TO_SOURCE]: true})]));

// Criteria copied from SubjectDashboardProfileTab.js:351.
const editSubjectCriteria = (subjectType) =>
    `privilege.name = '${Privilege.privilegeName.editSubject}' AND privilege.entityType = '${Privilege.privilegeEntityType.subject}' AND subjectTypeUuid = '${subjectType.uuid}'`;

// Criteria copied from SubjectDashboardProgramsTab.js:312, the same for an exit at :268.
const editEnrolmentCriteria = (subjectType, program) =>
    `privilege.name = '${Privilege.privilegeName.editEnrolmentDetails}' AND privilege.entityType = '${Privilege.privilegeEntityType.enrolment}' AND subjectTypeUuid = '${subjectType.uuid}' AND programUuid = '${program.uuid}'`;

// As SubjectDashboardProfileTab.editProfile and IndividualRegistrationDetailsActions.onEditStart.
export const resolveEditRegistration = (getService, args) => {
    const subject = findLiveSubject(getService, (args || {}).subjectUUID);
    if (subject == null) return notOnPhone();
    const {subjectType} = subject;
    if (!canViewSubject(getService, subjectType)) return {message: MessageKeys.noPermission};
    const refusal = editRefusal(getService, {
        criteria: editSubjectCriteria(subjectType),
        privilegeParam: 'subjectTypeUuid',
        findForm: formMappingService => formMappingService.findRegistrationForm(subjectType),
        entity: subject,
        entityName: 'Individual',
    });
    if (refusal != null) return refusal;
    return {
        navigate: view => {
            logEvent(firebaseEvents.EDIT_SUBJECT);
            const workLists = editWorkLists(`${subjectType.name} `, WorkItem.type.REGISTRATION, {uuid: subject.uuid, subjectTypeName: subjectType.name});
            CHSNavigator.navigateToRegisterView(view, {workLists});
        }
    };
};

// As ProgramEnrolmentDashboardActions.onEditEnrolment and onEditEnrolmentExit. Only an exit needs an exited enrolment.
const resolveEditProgramForm = (getService, args, {exitOnly, findForm, listName, navigate}) => {
    const found = findLiveEnrolment(getService, (args || {}).enrolmentUUID);
    if (found == null) return notOnPhone();
    const {enrolment, subject} = found;
    const {subjectType} = subject;
    const {program} = enrolment;
    if (!canViewSubject(getService, subjectType)) return {message: MessageKeys.noPermission};
    if (exitOnly && enrolment.isActive) return {message: MessageKeys.notAvailable};
    const refusal = editRefusal(getService, {
        criteria: editEnrolmentCriteria(subjectType, program),
        privilegeParam: 'programUuid',
        findForm: formMappingService => findForm(formMappingService, program, subjectType),
        entity: enrolment,
        entityName: 'ProgramEnrolment',
    });
    if (refusal != null) return refusal;
    return {
        navigate: view => navigate(view, enrolment,
            editWorkLists(listName, WorkItem.type.PROGRAM_ENROLMENT, {subjectUUID: subject.uuid, programName: program.name}))
    };
};

export const resolveEditEnrolment = (getService, args) => resolveEditProgramForm(getService, args, {
    exitOnly: false,
    findForm: (formMappingService, program, subjectType) => formMappingService.findFormForProgramEnrolment(program, subjectType),
    listName: 'Enrolment',
    navigate: (view, enrolment, workLists) => {
        logEvent(firebaseEvents.EDIT_ENROLMENT);
        CHSNavigator.navigateToProgramEnrolmentView(view, enrolment, workLists, true);
    },
});

export const resolveEditExit = (getService, args) => resolveEditProgramForm(getService, args, {
    exitOnly: true,
    findForm: (formMappingService, program, subjectType) => formMappingService.findFormForProgramExit(program, subjectType),
    listName: 'Exit',
    navigate: (view, enrolment, workLists) => {
        logEvent(firebaseEvents.EDIT_PROGRAM_EXIT);
        CHSNavigator.navigateToExitProgram(view, enrolment, workLists, true);
    },
});

// Runs a resolver and acts on its outcome.
export const runOutcome = (page, outcome) => {
    if (outcome.navigate) page.navigate(outcome.navigate);
    else page.showMessage(outcome.message);
};

const command = (resolver) => (service, args, page) =>
    runOutcome(page, resolver(cls => service.getService(cls), args));

export const RECORD_COMMANDS = {
    openSubject: command(resolveOpenSubject),
    openEnrolment: command(resolveOpenEnrolment),
    openVisit: command(resolveOpenVisit),
    editRegistration: command(resolveEditRegistration),
    editEnrolment: command(resolveEditEnrolment),
    editExit: command(resolveEditExit),
};
