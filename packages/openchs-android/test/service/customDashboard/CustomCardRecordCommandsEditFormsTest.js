jest.mock("../../../src/utility/Analytics", () => ({
    __esModule: true,
    logEvent: jest.fn(),
    firebaseEvents: {EDIT_SUBJECT: 'edit_subject', EDIT_ENROLMENT: 'edit_enrolment', EDIT_PROGRAM_EXIT: 'edit_enrolment_exit'},
}));
jest.mock("../../../src/utility/bugsnag", () => ({__esModule: true, default: {notify: jest.fn()}}));
jest.mock("../../../src/utility/CHSNavigator", () => ({
    __esModule: true,
    default: {navigateToRegisterView: jest.fn(), navigateToProgramEnrolmentView: jest.fn(), navigateToExitProgram: jest.fn()},
}));

import _ from "lodash";
import {ActionEligibilityResponse} from "rules-config";
import {WorkItem, WorkLists} from "avni-models";
import CHSNavigator from "../../../src/utility/CHSNavigator";
import {logEvent} from "../../../src/utility/Analytics";
import {returnsToSource} from "../../../src/utility/ReturnToSource";
import {
    RECORD_COMMANDS,
    editRuleMessage,
    resolveEditEnrolment,
    resolveEditExit,
    resolveEditRegistration,
} from "../../../src/service/customDashboard/CustomCardRecordCommands";
import {enrolment, fakePage, servicesFor, subject} from "./RecordCommandFixture";

// The profile's literals with st1 and p1 put in: SubjectDashboardProfileTab.js:351, SubjectDashboardProgramsTab.js:268 and :312.
const VIEW_PAIR = ["privilege.name = 'View subject' AND privilege.entityType = 'Subject'", 'subjectTypeUuid'];
const EDIT_SUBJECT_PAIR = ["privilege.name = 'Edit subject' AND privilege.entityType = 'Subject' AND subjectTypeUuid = 'st1'", 'subjectTypeUuid'];
const EDIT_ENROLMENT_PAIR = ["privilege.name = 'Edit enrolment details' AND privilege.entityType = 'Enrolment' AND subjectTypeUuid = 'st1' AND programUuid = 'p1'", 'programUuid'];

const NOT_ON_PHONE = {message: 'recordNotOnThisPhone'};
const NO_PERMISSION = {message: 'noPermissionForThisAction'};
const NOT_AVAILABLE = {message: 'customCardActionNotAvailable'};
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const subjectType = {uuid: 'st1', name: 'Woman'};
const program = {uuid: 'p1', name: 'Pregnancy'};
const exited = {programExitDateTime: new Date(2026, 9, 1)};
const records = () => ({
    Individual: {s1: subject('s1', {subjectType}), sv: subject('sv', {subjectType, voided: true})},
    ProgramEnrolment: {
        e1: enrolment('e1', 's1', {program}),
        ex: enrolment('ex', 's1', {program, ...exited}),
        ev: enrolment('ev', 's1', {program, voided: true}),
        exv: enrolment('exv', 's1', {program, ...exited, voided: true}),
        eOfVoided: enrolment('eOfVoided', 'sv', {program}),
        exOfVoided: enrolment('exOfVoided', 'sv', {program, ...exited}),
        exNoSubject: enrolment('exNoSubject', 'missing', {program, ...exited}),
    },
});
const forms = {IndividualProfile: {uuid: 'fReg'}, ProgramEnrolment: {uuid: 'fEnrol'}, ProgramExit: {uuid: 'fExit'}};
const rights = {'View subject': ['st1'], 'Edit subject': ['st1'], 'Edit enrolment details': ['p1']};
const refusing = (message) => () => ActionEligibilityResponse.createDisallowedResponse(message);

let recs;
const svc = (extra = {}) => servicesFor({records: recs, rights, forms, ...extra});

beforeEach(() => {
    jest.clearAllMocks();
    recs = records();
});

const run = (outcome, view = {v: 1}) => {
    expect(typeof outcome.navigate).toBe('function');
    outcome.navigate(view);
    return view;
};

// The profile builds one work list holding one work item.
const onlyItem = (workLists, listName, itemType) => {
    expect(workLists).toBeInstanceOf(WorkLists);
    expect(workLists.workLists).toHaveLength(1);
    expect(workLists.currentWorkList.name).toBe(listName);
    expect(workLists.currentWorkList.workItems).toHaveLength(1);
    const item = workLists.getCurrentWorkItem();
    expect(item.type).toBe(itemType);
    expect(item.id).toMatch(UUID_V4);
    expect(returnsToSource(workLists)).toBe(true);
    return item;
};

const expectNoFormLookup = (getService) =>
    _.forEach(getService.formMappingService, lookup => expect(lookup).not.toHaveBeenCalled());

describe('editRegistration', () => {
    it("opens the registration in edit as the profile does, flagged to come back to the card", () => {
        const getService = svc();
        const view = run(resolveEditRegistration(getService, {subjectUUID: 's1'}));

        const nav = CHSNavigator.navigateToRegisterView;
        expect(nav).toHaveBeenCalledTimes(1);
        expect(nav.mock.calls[0]).toHaveLength(2);
        const [source, params] = nav.mock.calls[0];
        expect(source).toBe(view);
        expect(Object.keys(params)).toEqual(['workLists']);
        const item = onlyItem(params.workLists, 'Woman ', WorkItem.type.REGISTRATION);
        expect(item.parameters).toEqual({uuid: 's1', subjectTypeName: 'Woman', returnToSource: true});
        expect(logEvent).toHaveBeenCalledTimes(1);
        expect(logEvent).toHaveBeenCalledWith('edit_subject');
    });
    it('asks for the rights with the profile criteria, and runs the rule on the registration form', () => {
        const getService = svc();
        run(resolveEditRegistration(getService, {subjectUUID: 's1'}));
        expect(getService.pairsSeen).toEqual([VIEW_PAIR, EDIT_SUBJECT_PAIR]);
        expect(getService.formMappingService.findRegistrationForm).toHaveBeenCalledWith(recs.Individual.s1.subjectType);
        expect(getService.ruleEvaluationService.runEditFormRule).toHaveBeenCalledWith(forms.IndividualProfile, recs.Individual.s1, 'Individual');
    });
    it.each(['sv', 'unknown', 'e1', undefined, 123])('says not on this phone for %p', (uuid) => {
        expect(resolveEditRegistration(svc(), {subjectUUID: uuid})).toEqual(NOT_ON_PHONE);
    });
    it('says not on this phone when there are no args', () => {
        expect(resolveEditRegistration(svc(), undefined)).toEqual(NOT_ON_PHONE);
    });
});

describe('editEnrolment', () => {
    it("opens the enrolment in edit as the profile does, flagged to come back to the card", () => {
        const getService = svc();
        const view = run(resolveEditEnrolment(getService, {enrolmentUUID: 'e1'}));

        const nav = CHSNavigator.navigateToProgramEnrolmentView;
        expect(nav).toHaveBeenCalledTimes(1);
        expect(nav.mock.calls[0]).toHaveLength(4);
        const [source, enrolmentArg, workLists, editing] = nav.mock.calls[0];
        expect(source).toBe(view);
        expect(enrolmentArg).toBe(recs.ProgramEnrolment.e1);
        expect(editing).toBe(true);
        const item = onlyItem(workLists, 'Enrolment', WorkItem.type.PROGRAM_ENROLMENT);
        expect(item.parameters).toEqual({subjectUUID: 's1', programName: 'Pregnancy', returnToSource: true});
        expect(logEvent).toHaveBeenCalledTimes(1);
        expect(logEvent).toHaveBeenCalledWith('edit_enrolment');
    });
    it('asks for the rights with the profile criteria, and runs the rule on the enrolment form', () => {
        const getService = svc();
        run(resolveEditEnrolment(getService, {enrolmentUUID: 'e1'}));
        expect(getService.pairsSeen).toEqual([VIEW_PAIR, EDIT_ENROLMENT_PAIR]);
        expect(getService.formMappingService.findFormForProgramEnrolment).toHaveBeenCalledWith(program, recs.Individual.s1.subjectType);
        expect(getService.ruleEvaluationService.runEditFormRule).toHaveBeenCalledWith(forms.ProgramEnrolment, recs.ProgramEnrolment.e1, 'ProgramEnrolment');
    });
    it('opens an exited enrolment, as the profile lets its details be edited', () => {
        const view = run(resolveEditEnrolment(svc(), {enrolmentUUID: 'ex'}));
        expect(CHSNavigator.navigateToProgramEnrolmentView).toHaveBeenCalledWith(view, recs.ProgramEnrolment.ex, expect.any(WorkLists), true);
    });
    it.each(['ev', 'eOfVoided', 'exNoSubject', 'unknown', 's1', undefined])('says not on this phone for %p', (uuid) => {
        expect(resolveEditEnrolment(svc(), {enrolmentUUID: uuid})).toEqual(NOT_ON_PHONE);
    });
});

describe('editExit', () => {
    it("opens the exit in edit as the profile does, flagged to come back to the card", () => {
        const getService = svc();
        const view = run(resolveEditExit(getService, {enrolmentUUID: 'ex'}));

        const nav = CHSNavigator.navigateToExitProgram;
        expect(nav).toHaveBeenCalledTimes(1);
        expect(nav.mock.calls[0]).toHaveLength(4);
        const [source, enrolmentArg, workLists, editing] = nav.mock.calls[0];
        expect(source).toBe(view);
        expect(enrolmentArg).toBe(recs.ProgramEnrolment.ex);
        expect(editing).toBe(true);
        const item = onlyItem(workLists, 'Exit', WorkItem.type.PROGRAM_ENROLMENT);
        expect(item.parameters).toEqual({subjectUUID: 's1', programName: 'Pregnancy', returnToSource: true});
        expect(logEvent).toHaveBeenCalledTimes(1);
        expect(logEvent).toHaveBeenCalledWith('edit_enrolment_exit');
    });
    it('asks for the rights with the profile criteria, and runs the rule on the exit form', () => {
        const getService = svc();
        run(resolveEditExit(getService, {enrolmentUUID: 'ex'}));
        expect(getService.pairsSeen).toEqual([VIEW_PAIR, EDIT_ENROLMENT_PAIR]);
        expect(getService.formMappingService.findFormForProgramExit).toHaveBeenCalledWith(program, recs.Individual.s1.subjectType);
        expect(getService.ruleEvaluationService.runEditFormRule).toHaveBeenCalledWith(forms.ProgramExit, recs.ProgramEnrolment.ex, 'ProgramEnrolment');
    });
    it('is not available for an enrolment that has not exited, checked before the edit right', () => {
        const getService = svc({rights: _.omit(rights, 'Edit enrolment details')});
        expect(resolveEditExit(getService, {enrolmentUUID: 'e1'})).toEqual(NOT_AVAILABLE);
        expect(getService.pairsSeen).toEqual([VIEW_PAIR]);
        expectNoFormLookup(getService);
        expect(getService.ruleEvaluationService.runEditFormRule).not.toHaveBeenCalled();
    });
    it('checks the view right before whether the enrolment has exited', () => {
        expect(resolveEditExit(svc({rights: _.omit(rights, 'View subject')}), {enrolmentUUID: 'e1'})).toEqual(NO_PERMISSION);
    });
    it.each(['exv', 'exOfVoided', 'exNoSubject', 'unknown', 's1', undefined])('says not on this phone for %p', (uuid) => {
        expect(resolveEditExit(svc(), {enrolmentUUID: uuid})).toEqual(NOT_ON_PHONE);
    });
});

describe.each([
    {name: 'editRegistration', resolve: resolveEditRegistration, args: {subjectUUID: 's1'}, unknown: {subjectUUID: 'unknown'},
        editRight: 'Edit subject', editPair: EDIT_SUBJECT_PAIR, formType: 'IndividualProfile',
        navigator: 'navigateToRegisterView', event: 'edit_subject'},
    {name: 'editEnrolment', resolve: resolveEditEnrolment, args: {enrolmentUUID: 'e1'}, unknown: {enrolmentUUID: 'unknown'},
        editRight: 'Edit enrolment details', editPair: EDIT_ENROLMENT_PAIR, formType: 'ProgramEnrolment',
        navigator: 'navigateToProgramEnrolmentView', event: 'edit_enrolment'},
    {name: 'editExit', resolve: resolveEditExit, args: {enrolmentUUID: 'ex'}, unknown: {enrolmentUUID: 'unknown'},
        editRight: 'Edit enrolment details', editPair: EDIT_ENROLMENT_PAIR, formType: 'ProgramExit',
        navigator: 'navigateToExitProgram', event: 'edit_enrolment_exit'},
])('$name checks, in order', ({resolve, args, unknown, editRight, editPair, formType, navigator, event}) => {
    it('checks the record before any right', () => {
        const getService = svc({rights: {}});
        expect(resolve(getService, unknown)).toEqual(NOT_ON_PHONE);
        expect(getService.pairsSeen).toEqual([]);
    });
    it('needs the right to view the subject, before the edit right, the form or the rule', () => {
        const getService = svc({rights: _.omit(rights, 'View subject'), forms: {}, rule: refusing('Locked after approval')});
        expect(resolve(getService, args)).toEqual(NO_PERMISSION);
        expect(getService.pairsSeen).toEqual([VIEW_PAIR]);
        expectNoFormLookup(getService);
        expect(getService.ruleEvaluationService.runEditFormRule).not.toHaveBeenCalled();
    });
    it('needs the edit right, before the form or the rule', () => {
        const getService = svc({rights: _.omit(rights, editRight), forms: {}, rule: refusing('Locked after approval')});
        expect(resolve(getService, args)).toEqual(NO_PERMISSION);
        expect(getService.pairsSeen).toEqual([VIEW_PAIR, editPair]);
        expectNoFormLookup(getService);
        expect(getService.ruleEvaluationService.runEditFormRule).not.toHaveBeenCalled();
    });
    it('is not available without a form, and never runs the rule on a missing form', () => {
        const getService = svc({forms: _.omit(forms, formType), rule: refusing('Locked after approval')});
        expect(resolve(getService, args)).toEqual(NOT_AVAILABLE);
        expect(getService.ruleEvaluationService.runEditFormRule).not.toHaveBeenCalled();
    });
    it("gives the rule's own message when the edit rule refuses", () => {
        expect(resolve(svc({rule: refusing('Locked after approval')}), args)).toEqual({message: 'Locked after approval'});
        expect(logEvent).not.toHaveBeenCalled();
    });
    it('gives the no-permission message when the edit rule refuses without a message', () => {
        expect(resolve(svc({rule: refusing(undefined)}), args)).toEqual(NO_PERMISSION);
    });
    it('opens with all privileges and no rights', () => {
        run(resolve(svc({rights: {}, allPrivileges: true}), args));
        expect(CHSNavigator[navigator]).toHaveBeenCalledTimes(1);
    });
    it("logs the profile's event when the screen opens, not before", () => {
        const outcome = resolve(svc(), args);
        expect(logEvent).not.toHaveBeenCalled();
        expect(CHSNavigator[navigator]).not.toHaveBeenCalled();
        run(outcome);
        expect(logEvent).toHaveBeenCalledTimes(1);
        expect(logEvent).toHaveBeenCalledWith(event);
    });
});

describe('editRuleMessage', () => {
    const entity = {uuid: 'x'};
    const form = {uuid: 'f'};
    it('is null when the rule allows the edit', () => {
        expect(editRuleMessage(svc(), form, entity, 'Individual')).toBeNull();
    });
    it('runs the rule with the form, the entity and the entity name it is given', () => {
        const getService = svc();
        editRuleMessage(getService, form, entity, 'ProgramEnrolment');
        expect(getService.ruleEvaluationService.runEditFormRule).toHaveBeenCalledWith(form, entity, 'ProgramEnrolment');
    });
    it("is the rule's message when it refuses with one", () => {
        expect(editRuleMessage(svc({rule: refusing('Locked after approval')}), form, entity, 'Individual')).toBe('Locked after approval');
    });
    it.each([undefined, '', '   ', 42])('is the no-permission key when the rule refuses with %p', (message) => {
        expect(editRuleMessage(svc({rule: refusing(message)}), form, entity, 'Individual')).toBe('noPermissionForThisAction');
    });
});

// Reads `this`, as BaseService.getService does, so an unbound call fails here as it would on the phone.
const fakeService = (getService) => ({context: {getService}, getService(cls) {return this.context.getService(cls);}});

describe('RECORD_COMMANDS edits', () => {
    it('editRegistration navigates once through the page and shows no message', () => {
        const page = fakePage();
        RECORD_COMMANDS.editRegistration(fakeService(svc()), {subjectUUID: 's1'}, page);
        expect(page.navigate).toHaveBeenCalledTimes(1);
        expect(page.showMessage).not.toHaveBeenCalled();
        expect(CHSNavigator.navigateToRegisterView).toHaveBeenCalledWith(page.view, {workLists: expect.any(WorkLists)});
    });
    it("editEnrolment shows the edit rule's message and does not navigate", () => {
        const page = fakePage();
        RECORD_COMMANDS.editEnrolment(fakeService(svc({rule: refusing('Locked after approval')})), {enrolmentUUID: 'e1'}, page);
        expect(page.showMessage).toHaveBeenCalledWith('Locked after approval');
        expect(page.navigate).not.toHaveBeenCalled();
    });
    it('editExit opens an exited enrolment through the page', () => {
        const page = fakePage();
        RECORD_COMMANDS.editExit(fakeService(svc()), {enrolmentUUID: 'ex'}, page);
        expect(page.navigate).toHaveBeenCalledTimes(1);
        expect(CHSNavigator.navigateToExitProgram).toHaveBeenCalledWith(page.view, recs.ProgramEnrolment.ex, expect.any(WorkLists), true);
    });
    it('editExit shows the not-available message for an active enrolment', () => {
        const page = fakePage();
        RECORD_COMMANDS.editExit(fakeService(svc()), {enrolmentUUID: 'e1'}, page);
        expect(page.showMessage).toHaveBeenCalledWith('customCardActionNotAvailable');
        expect(page.navigate).not.toHaveBeenCalled();
    });
});
