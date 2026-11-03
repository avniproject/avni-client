import _ from "lodash";
import {Encounter, Individual, Privilege, ProgramEncounter, ProgramEnrolment} from "avni-models";
import CHSNavigator from "../../utility/CHSNavigator";
import EntityService from "../EntityService";
import PrivilegeService from "../PrivilegeService";

// Commands a Custom Design Card page can send to open, edit or start a record. Plain functions: the command service
// calls them with itself, the page's arguments and a page handle. Order in every resolver: the record, then the
// user's right to see it, then the navigation. Every check finishes before an outcome with `navigate` is returned.

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
};
