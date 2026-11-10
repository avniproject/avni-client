import _ from "lodash";
import {Encounter, EncounterType, Form, Individual, Privilege, ProgramEncounter, ProgramEnrolment, SubjectType, WorkItem, WorkList, WorkLists} from "avni-models";
import General from "../../utility/General";
import {firebaseEvents, logEvent} from "../../utility/Analytics";
import {RETURN_TO_SOURCE} from "../../utility/ReturnToSource";
import EntityService from "../EntityService";
import FormMappingService from "../FormMappingService";
import PrivilegeService from "../PrivilegeService";

// Commands a Custom Design Card page can send to open, edit or start a record. Plain functions: the command service
// calls them with itself, the page's arguments and a page handle. Order in every resolver but openSubject, which checks
// the tab name first: the record, then the
// user's right to see it, then the checks the profile runs for that action, then the navigation. A record's state,
// such as an exited enrolment, is one of those checks, so a user without the right is never told it. Every check
// finishes before an outcome with `navigate` is returned.

export const MessageKeys = {
    notOnPhone: 'recordNotOnThisPhone',
    noPermission: 'noPermissionForThisAction',
    notAvailable: 'customCardActionNotAvailable',
};

export const TAB_NUMBERS = {profile: 1, program: 2, general: 3};

// CHSNavigator, the rule service and the dashboard actions are required where they are used, not when this module
// loads. The command service imports this module, so what this module imports loads wherever the service loads.
// CHSNavigator imports every screen, and a unit test cannot load them: one calls a native module at load. The other two
// reach the Bugsnag setup, which warns in a unit test.
const chsNavigator = () => require("../../utility/CHSNavigator").default;

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
    return {navigate: view => chsNavigator().navigateToProgramEnrolmentDashboardView(view, subject.uuid, enrolmentUUID, false, null, null, tab)};
};

export const resolveOpenSubject = (getService, args) => {
    const {subjectUUID, tab} = args || {};
    const noTab = _.isNil(tab);
    if (!noTab && !(typeof tab === 'string' && Object.prototype.hasOwnProperty.call(TAB_NUMBERS, tab))) return {message: MessageKeys.notAvailable};
    const subject = findLiveSubject(getService, subjectUUID);
    if (subject == null) return notOnPhone();
    if (!canViewSubject(getService, subject.subjectType)) return {message: MessageKeys.noPermission};
    if (noTab) return {navigate: view => chsNavigator().navigateToProgramEnrolmentDashboardView(view, subject.uuid)};
    return {navigate: view => chsNavigator().navigateToProgramEnrolmentDashboardView(view, subject.uuid, null, false, null, null, TAB_NUMBERS[tab])};
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
    const RuleEvaluationService = require("../RuleEvaluationService").default;
    const response = getService(RuleEvaluationService).runEditFormRule(form, entity, entityName);
    if (response.isAllowed()) return null;
    const message = response.getMessage();
    return _.isString(message) && _.trim(message) !== '' ? message : MessageKeys.noPermission;
};

// A form, then the form's edit rule. The rule reads the form with no null check, so the form is checked first. Null
// when the edit may go ahead.
const formRuleRefusal = (getService, form, entity, entityName) => {
    if (_.isNil(form)) return {message: MessageKeys.notAvailable};
    const ruleMessage = editRuleMessage(getService, form, entity, entityName);
    return ruleMessage == null ? null : {message: ruleMessage};
};

// The checks after the view right, in order: the edit right, a form, then the form's edit rule. Null when the edit may
// go ahead.
const editRefusal = (getService, {criteria, privilegeParam, findForm, entity, entityName}) => {
    if (!getService(PrivilegeService).hasActionPrivilegeForCriteria(criteria, privilegeParam)) return {message: MessageKeys.noPermission};
    return formRuleRefusal(getService, findForm(getService(FormMappingService)), entity, entityName);
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
    // The profile shows the registration section, and its Edit, only unless this setting is false (SubjectDashboardProfileTab.js:388).
    if (subjectType.getSetting(SubjectType.settingKeys.displayRegistrationDetails) === false) return {message: MessageKeys.notAvailable};
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
            chsNavigator().navigateToRegisterView(view, {workLists});
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
        chsNavigator().navigateToProgramEnrolmentView(view, enrolment, workLists, true);
    },
});

export const resolveEditExit = (getService, args) => resolveEditProgramForm(getService, args, {
    exitOnly: true,
    findForm: (formMappingService, program, subjectType) => formMappingService.findFormForProgramExit(program, subjectType),
    listName: 'Exit',
    navigate: (view, enrolment, workLists) => {
        logEvent(firebaseEvents.EDIT_PROGRAM_EXIT);
        chsNavigator().navigateToExitProgram(view, enrolment, workLists, true);
    },
});

// Criteria copied from SubjectDashboardGeneralTab.js:76 and :95 for a general visit, and from
// SubjectDashboardProgramsTab.js:247 (edit) and :393 (perform) for a programme visit. Those two name the uuids in
// opposite orders.
const visitCriteria = (privilegeName, subjectType, program) => {
    const head = `privilege.name = '${privilegeName}' AND privilege.entityType = '${Privilege.privilegeEntityType.encounter}'`;
    if (_.isNil(program)) return `${head} AND programUuid = null AND subjectTypeUuid = '${subjectType.uuid}'`;
    return privilegeName === Privilege.privilegeName.performVisit
        ? `${head} AND subjectTypeUuid = '${subjectType.uuid}' AND programUuid = '${program.uuid}'`
        : `${head} AND programUuid = '${program.uuid}' AND subjectTypeUuid = '${subjectType.uuid}'`;
};

// A visit right is given per visit type: all privileges, or the type in the list, as PreviousEncounters.js:105 and
// :140 check it. No programme means a general visit.
export const visitTypeAllowed = (getService, privilegeName, subjectType, program, encounterTypeUuid) => {
    const privilegeService = getService(PrivilegeService);
    if (privilegeService.hasAllPrivileges()) return true;
    const field = _.isNil(program) ? 'encounterTypeUuid' : 'programEncounterTypeUuid';
    const allowed = privilegeService.allowedEntityTypeUUIDListForCriteria(visitCriteria(privilegeName, subjectType, program), field);
    return _.includes(allowed, encounterTypeUuid);
};

// The form whose edit rule the profile runs (D6). A programme visit takes its cancel form when it is cancelled
// (ProgramEnrolmentDashboardActions.js:218). A general visit takes its visit form even then, because the profile picks
// by action.cancel, which an edit never sets (IndividualGeneralHistoryActions.js:111).
const visitRuleFormType = (visit, isProgramVisit) => {
    if (!isProgramVisit) return Form.formTypes.Encounter;
    return visit.isCancelled() ? Form.formTypes.ProgramEncounterCancellation : Form.formTypes.ProgramEncounter;
};

// As PreviousEncounters.editEncounter, with the profile's reducers for a done or cancelled visit
// (IndividualGeneralHistoryActions.onEditEncounter, ProgramEnrolmentDashboardActions.onEditProgramEncounter). A planned
// visit is the profile's Do, which needs only the right to perform its type (D4). CHSNavigator.navigateToEncounterView logs
// the edit event and opens a cancelled visit's cancel form.
export const resolveEditVisit = (getService, args) => {
    const found = findLiveVisit(getService, (args || {}).visitUUID);
    if (found == null) return notOnPhone();
    const {visit, isProgramVisit, subject, enrolment} = found;
    const {subjectType} = subject;
    if (!canViewSubject(getService, subjectType)) return {message: MessageKeys.noPermission};
    const program = isProgramVisit ? enrolment.program : null;
    const {encounterType} = visit;
    // One clone, as PreviousEncounters.js:77-79 makes it. The rule and the visit screen both get this object.
    const clone = visit.cloneForEdit();
    const editing = !clone.isScheduled();
    if (_.isNil(clone.encounterDateTime)) clone.encounterDateTime = new Date();
    if (!editing) {
        if (!visitTypeAllowed(getService, Privilege.privilegeName.performVisit, subjectType, program, encounterType.uuid)) return {message: MessageKeys.noPermission};
    } else {
        if (encounterType.immutable) return {message: MessageKeys.notAvailable};
        if (!visitTypeAllowed(getService, Privilege.privilegeName.editVisit, subjectType, program, encounterType.uuid)) return {message: MessageKeys.noPermission};
        const form = getService(FormMappingService).findFormForEncounterType(encounterType, visitRuleFormType(clone, isProgramVisit), subjectType);
        const refusal = formRuleRefusal(getService, form, clone, isProgramVisit ? 'ProgramEncounter' : 'Encounter');
        if (refusal != null) return refusal;
    }
    return {
        navigate: view => chsNavigator().navigateToEncounterView(view, {
            encounter: clone,
            editing,
            individualUUID: subject.uuid,
            onSaveCallback: source => chsNavigator().navigateBackAfterDoVisit(source),
        })
    };
};

// The planned visit of that type if there is one, else a new one. That is this command's own rule. The New visit menu
// (NewVisitMenuView.js:86, :94) lets the user pick between planned visits and types, and the Do visit card
// (CustomDashboardActions.js:28-38) does one or the other by its setting, so neither does both. Of several planned
// visits the earliest due starts. No enrolment (empty, or the text a card template writes for a missing value) means a
// general visit. The type must be one
// the record uses, as the profile lists them (IndividualGeneralHistoryActions.js:35, StartProgramActions.js:46). A new
// visit also needs the type's eligibility rule to allow it, as the profile lists only the types the rule allows
// (IndividualGeneralHistoryActions.js:35-37, StartProgramActions.js:47-48 and :55-56). A planned visit runs no rule, as
// StartProgramActions.js:33-41 lists planned visits without one.
// A card template builds a row with +, so a missing enrolment arrives as one of these.
const NO_ENROLMENT = [null, undefined, '', 'null', 'undefined'];

export const resolveStartVisit = (getService, args) => {
    const {subjectUUID, visitTypeUUID, enrolmentUUID} = args || {};
    const subject = findLiveSubject(getService, subjectUUID);
    if (subject == null) return notOnPhone();
    const encounterType = findLiveRecord(getService, visitTypeUUID, EncounterType.schema.name);
    if (encounterType == null) return notOnPhone();
    let enrolment = null;
    if (!NO_ENROLMENT.includes(enrolmentUUID)) {
        const found = findLiveEnrolment(getService, enrolmentUUID);
        if (found == null || found.subject.uuid !== subject.uuid) return notOnPhone();
        enrolment = found.enrolment;
    }
    const {subjectType} = subject;
    if (!canViewSubject(getService, subjectType)) return {message: MessageKeys.noPermission};
    if (enrolment != null && !enrolment.isActive) return {message: MessageKeys.notAvailable};
    const program = enrolment == null ? null : enrolment.program;
    const formMappingService = getService(FormMappingService);
    const typesInUse = enrolment == null
        ? formMappingService.findActiveEncounterTypesForEncounter(subjectType)
        : formMappingService.findActiveEncounterTypesForProgram(program, subjectType);
    if (!_.some(typesInUse, type => type.uuid === encounterType.uuid)) return {message: MessageKeys.notAvailable};
    if (!visitTypeAllowed(getService, Privilege.privilegeName.performVisit, subjectType, program, encounterType.uuid)) return {message: MessageKeys.noPermission};
    const parent = enrolment == null ? subject : enrolment;
    const {findScheduledEncounters} = require("../../action/customDashboard/CustomDashboardActions");
    // The newer database lists a parent's visits in no set order, so the earliest due is taken. minBy keeps the first of a tie.
    const planned = _.minBy(findScheduledEncounters(parent, encounterType), visit => visit.earliestVisitDateTime);
    // Any falsy answer refuses: the profile filters its lists with Array.filter, which keeps a type on any truthy one.
    // The subject goes to the rule for a programme visit too, as StartProgramActions.js:48 passes enrolment.individual.
    if (planned == null) {
        const RuleEvaluationService = require("../RuleEvaluationService").default;
        if (!getService(RuleEvaluationService).isEligibleForEncounter(subject, encounterType)) return {message: MessageKeys.notAvailable};
    }
    return {
        navigate: view => chsNavigator().proceedEncounter(planned || encounterType, parent, source => chsNavigator().navigateBackAfterDoVisit(source), view)
    };
};

// Acts on a resolver's outcome: navigates, or shows its message. `command` runs the resolver.
const runOutcome = (page, outcome) => {
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
    editVisit: command(resolveEditVisit),
    startVisit: command(resolveStartVisit),
};
