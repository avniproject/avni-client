jest.mock("../../../src/utility/Analytics", () => ({__esModule: true, default: {}, logEvent: jest.fn(), firebaseEvents: {}}));
jest.mock("../../../src/utility/bugsnag", () => ({__esModule: true, default: {notify: jest.fn()}}));
jest.mock("../../../src/utility/CHSNavigator", () => ({
    __esModule: true,
    default: {navigateToEncounterView: jest.fn(), navigateBackAfterDoVisit: jest.fn()},
}));

import _ from "lodash";
import {ActionEligibilityResponse} from "rules-config";
import CHSNavigator from "../../../src/utility/CHSNavigator";
import {logEvent} from "../../../src/utility/Analytics";
import {RECORD_COMMANDS, resolveEditVisit, visitTypeAllowed} from "../../../src/service/customDashboard/CustomCardRecordCommands";
import {enrolment, fakePage, servicesFor, subject, visit} from "./RecordCommandFixture";

// The profile's literals with st1 and p1 put in. A general visit: SubjectDashboardGeneralTab.js:76 (perform) and :95
// (edit). A programme visit: SubjectDashboardProgramsTab.js:247 (edit) and :393 (perform), which name the two uuids in
// opposite orders.
const VIEW_PAIR = ["privilege.name = 'View subject' AND privilege.entityType = 'Subject'", 'subjectTypeUuid'];
const GENERAL_EDIT_PAIR = ["privilege.name = 'Edit visit' AND privilege.entityType = 'Encounter' AND programUuid = null AND subjectTypeUuid = 'st1'", 'encounterTypeUuid'];
const GENERAL_PERFORM_PAIR = ["privilege.name = 'Perform visit' AND privilege.entityType = 'Encounter' AND programUuid = null AND subjectTypeUuid = 'st1'", 'encounterTypeUuid'];
const PROGRAM_EDIT_PAIR = ["privilege.name = 'Edit visit' AND privilege.entityType = 'Encounter' AND programUuid = 'p1' AND subjectTypeUuid = 'st1'", 'programEncounterTypeUuid'];
const PROGRAM_PERFORM_PAIR = ["privilege.name = 'Perform visit' AND privilege.entityType = 'Encounter' AND subjectTypeUuid = 'st1' AND programUuid = 'p1'", 'programEncounterTypeUuid'];

const NOT_ON_PHONE = {message: 'recordNotOnThisPhone'};
const NO_PERMISSION = {message: 'noPermissionForThisAction'};
const NOT_AVAILABLE = {message: 'customCardActionNotAvailable'};

const subjectType = {uuid: 'st1', name: 'Woman'};
const program = {uuid: 'p1', name: 'Pregnancy'};
const homeVisit = {uuid: 'gt1', name: 'Home visit', immutable: false};
const ancVisit = {uuid: 'pt1', name: 'ANC', immutable: false};
const lockedHomeVisit = {uuid: 'gt2', name: 'Birth record', immutable: true};
const lockedAncVisit = {uuid: 'pt2', name: 'Delivery', immutable: true};
const doneOn = new Date(2026, 9, 1);
const planned = {encounterDateTime: null, cancelDateTime: null};
const done = {encounterDateTime: doneOn, cancelDateTime: null};
const cancelled = {encounterDateTime: null, cancelDateTime: new Date(2026, 9, 2)};

const general = (uuid, encounterType, state, extra = {}) => visit(uuid, {subjectUuid: 's1', encounterType, ...state, ...extra});
const programme = (uuid, encounterType, state, extra = {}) => visit(uuid, {enrolmentUuid: 'e1', encounterType, ...state, ...extra});

const records = () => ({
    Individual: {s1: subject('s1', {subjectType}), sv: subject('sv', {subjectType, voided: true})},
    ProgramEnrolment: {
        e1: enrolment('e1', 's1', {program}),
        ev: enrolment('ev', 's1', {program, voided: true}),
        eOfVoided: enrolment('eOfVoided', 'sv', {program}),
        eNoSubject: enrolment('eNoSubject', 'missing', {program}),
    },
    Encounter: {
        gDone: general('gDone', homeVisit, done),
        gCancelled: general('gCancelled', homeVisit, cancelled),
        gPlanned: general('gPlanned', homeVisit, planned),
        gLocked: general('gLocked', lockedHomeVisit, done),
        gLockedCancelled: general('gLockedCancelled', lockedHomeVisit, cancelled),
        gLockedPlanned: general('gLockedPlanned', lockedHomeVisit, planned),
        gVoided: general('gVoided', homeVisit, done, {voided: true}),
        gOfVoided: visit('gOfVoided', {subjectUuid: 'sv', encounterType: homeVisit, ...done}),
        gNoSubject: visit('gNoSubject', {subjectUuid: 'missing', encounterType: homeVisit, ...done}),
    },
    ProgramEncounter: {
        pDone: programme('pDone', ancVisit, done),
        pCancelled: programme('pCancelled', ancVisit, cancelled),
        pPlanned: programme('pPlanned', ancVisit, planned),
        pLocked: programme('pLocked', lockedAncVisit, done),
        pLockedCancelled: programme('pLockedCancelled', lockedAncVisit, cancelled),
        pLockedPlanned: programme('pLockedPlanned', lockedAncVisit, planned),
        pVoided: programme('pVoided', ancVisit, done, {voided: true}),
        pOfVoidedEnrolment: visit('pOfVoidedEnrolment', {enrolmentUuid: 'ev', encounterType: ancVisit, ...done}),
        pOfVoidedSubject: visit('pOfVoidedSubject', {enrolmentUuid: 'eOfVoided', encounterType: ancVisit, ...done}),
        pOfEnrolmentWithoutSubject: visit('pOfEnrolmentWithoutSubject', {enrolmentUuid: 'eNoSubject', encounterType: ancVisit, ...done}),
        pNoEnrolment: visit('pNoEnrolment', {enrolmentUuid: 'missing', encounterType: ancVisit, ...done}),
    },
});
// General visits have a cancel form too, so a test can tell that their edit rule comes from the visit form.
const forms = {
    Encounter: {uuid: 'fVisit'},
    IndividualEncounterCancellation: {uuid: 'fVisitCancel'},
    ProgramEncounter: {uuid: 'fProgramVisit'},
    ProgramEncounterCancellation: {uuid: 'fProgramVisitCancel'},
};
const allTypes = ['gt1', 'gt2', 'pt1', 'pt2'];
const rights = {'View subject': ['st1'], 'Edit visit': allTypes, 'Perform visit': allTypes};
const refusing = (message) => () => ActionEligibilityResponse.createDisallowedResponse(message);

let recs;
const svc = (extra = {}) => servicesFor({records: recs, rights, forms, ...extra});
const stored = (uuid) => recs.Encounter[uuid] || recs.ProgramEncounter[uuid];

beforeEach(() => {
    jest.clearAllMocks();
    recs = records();
});

const run = (outcome, view = {v: 1}) => {
    expect(typeof outcome.navigate).toBe('function');
    outcome.navigate(view);
    return view;
};

// The one call to navigateToEncounterView, which takes the source and the params.
const opened = () => {
    const nav = CHSNavigator.navigateToEncounterView;
    expect(nav).toHaveBeenCalledTimes(1);
    expect(nav.mock.calls[0]).toHaveLength(2);
    const [source, params] = nav.mock.calls[0];
    return {source, params};
};

const expectComesBackToTheCard = (onSaveCallback) => {
    const saveSource = {name: 'the visit summary'};
    onSaveCallback(saveSource, 'anything else');
    const calls = CHSNavigator.navigateBackAfterDoVisit.mock.calls;
    expect(calls).toHaveLength(1);
    expect(calls[0]).toHaveLength(1);
    expect(calls[0][0]).toBe(saveSource);
};

const expectNow = (date, before, after) => {
    expect(date).toBeInstanceOf(Date);
    expect(date.getTime()).toBeGreaterThanOrEqual(before);
    expect(date.getTime()).toBeLessThanOrEqual(after);
};

const expectNoFormOrRule = (getService) => {
    _.forEach(getService.formMappingService, lookup => expect(lookup).not.toHaveBeenCalled());
    expect(getService.ruleEvaluationService.runEditFormRule).not.toHaveBeenCalled();
};

describe.each([
    {kind: 'general', entityName: 'Encounter', editPair: GENERAL_EDIT_PAIR, performPair: GENERAL_PERFORM_PAIR, formType: 'Encounter',
        doneUuid: 'gDone', cancelledUuid: 'gCancelled', plannedUuid: 'gPlanned',
        lockedUuid: 'gLocked', lockedCancelledUuid: 'gLockedCancelled', lockedPlannedUuid: 'gLockedPlanned'},
    {kind: 'programme', entityName: 'ProgramEncounter', editPair: PROGRAM_EDIT_PAIR, performPair: PROGRAM_PERFORM_PAIR, formType: 'ProgramEncounter',
        doneUuid: 'pDone', cancelledUuid: 'pCancelled', plannedUuid: 'pPlanned',
        lockedUuid: 'pLocked', lockedCancelledUuid: 'pLockedCancelled', lockedPlannedUuid: 'pLockedPlanned'},
])('editVisit on a $kind visit', ({entityName, editPair, performPair, formType, doneUuid, cancelledUuid, plannedUuid, lockedUuid, lockedCancelledUuid, lockedPlannedUuid}) => {
    describe('done', () => {
        it('opens one clone in edit, made when the command resolves, with the subject and a save that comes back to the card', () => {
            const record = stored(doneUuid);
            const cloneForEdit = jest.spyOn(record, 'cloneForEdit');
            const outcome = resolveEditVisit(svc(), {visitUUID: doneUuid});
            expect(cloneForEdit).toHaveBeenCalledTimes(1);
            expect(CHSNavigator.navigateToEncounterView).not.toHaveBeenCalled();

            const view = run(outcome);
            expect(cloneForEdit).toHaveBeenCalledTimes(1);
            const {source, params} = opened();
            expect(source).toBe(view);
            expect(Object.keys(params).sort()).toEqual(['editing', 'encounter', 'individualUUID', 'onSaveCallback']);
            expect(params.encounter).toBe(cloneForEdit.mock.results[0].value);
            expect(params.encounter).not.toBe(record);
            expect(params.encounter.uuid).toBe(doneUuid);
            expect(params.encounter.encounterDateTime).toBe(doneOn);
            expect(params.editing).toBe(true);
            expect(params.individualUUID).toBe('s1');
            expectComesBackToTheCard(params.onSaveCallback);
            expect(logEvent).not.toHaveBeenCalled();
        });
        it('asks for the edit right with the profile criteria, and runs the rule of the visit form on that clone', () => {
            const getService = svc();
            run(resolveEditVisit(getService, {visitUUID: doneUuid}));
            const {params} = opened();
            expect(getService.pairsSeen).toEqual([VIEW_PAIR, editPair]);
            const lookup = getService.formMappingService.findFormForEncounterType;
            expect(lookup).toHaveBeenCalledTimes(1);
            expect(lookup).toHaveBeenCalledWith(stored(doneUuid).encounterType, formType, subjectType);
            const rule = getService.ruleEvaluationService.runEditFormRule;
            expect(rule).toHaveBeenCalledTimes(1);
            const [form, entity, name] = rule.mock.calls[0];
            expect(form).toBe(forms[formType]);
            expect(entity).toBe(params.encounter);
            expect(name).toBe(entityName);
        });
        it('needs the edit right for its own visit type', () => {
            const getService = svc({rights: {...rights, 'Edit visit': ['another type']}});
            expect(resolveEditVisit(getService, {visitUUID: doneUuid})).toEqual(NO_PERMISSION);
            expect(getService.pairsSeen).toEqual([VIEW_PAIR, editPair]);
        });
        it('needs the edit right, which the perform right does not stand in for, before the form or the rule', () => {
            const getService = svc({rights: _.omit(rights, 'Edit visit'), forms: {}, rule: refusing('Locked after approval')});
            expect(resolveEditVisit(getService, {visitUUID: doneUuid})).toEqual(NO_PERMISSION);
            expect(getService.pairsSeen).toEqual([VIEW_PAIR, editPair]);
            expectNoFormOrRule(getService);
        });
        it.each([lockedUuid, lockedCancelledUuid])('is not available when the visit type is not editable (%s), even with the edit right, before the edit right is asked', (uuid) => {
            const getService = svc();
            expect(resolveEditVisit(getService, {visitUUID: uuid})).toEqual(NOT_AVAILABLE);
            expect(getService.pairsSeen).toEqual([VIEW_PAIR]);
            expectNoFormOrRule(getService);
        });
        it('is not available when the visit type is not editable, even with all privileges', () => {
            expect(resolveEditVisit(svc({rights: {}, allPrivileges: true}), {visitUUID: lockedUuid})).toEqual(NOT_AVAILABLE);
        });
        it('is not available without a form, and never runs the rule on a missing form', () => {
            const getService = svc({forms: _.omit(forms, formType), rule: refusing('Locked after approval')});
            expect(resolveEditVisit(getService, {visitUUID: doneUuid})).toEqual(NOT_AVAILABLE);
            expect(getService.ruleEvaluationService.runEditFormRule).not.toHaveBeenCalled();
            expect(CHSNavigator.navigateToEncounterView).not.toHaveBeenCalled();
        });
        it("gives the rule's own message when the edit rule refuses, and opens nothing", () => {
            expect(resolveEditVisit(svc({rule: refusing('Locked after approval')}), {visitUUID: doneUuid})).toEqual({message: 'Locked after approval'});
            expect(CHSNavigator.navigateToEncounterView).not.toHaveBeenCalled();
        });
        it('gives the no-permission message when the edit rule refuses without a message', () => {
            expect(resolveEditVisit(svc({rule: refusing(undefined)}), {visitUUID: doneUuid})).toEqual(NO_PERMISSION);
        });
        it('opens with all privileges and no rights', () => {
            run(resolveEditVisit(svc({rights: {}, allPrivileges: true}), {visitUUID: doneUuid}));
            expect(opened().params.editing).toBe(true);
        });
    });

    describe('cancelled', () => {
        it('opens the clone in edit, still cancelled, so the visit screen opens its cancel form', () => {
            const record = stored(cancelledUuid);
            const view = run(resolveEditVisit(svc(), {visitUUID: cancelledUuid}));
            const {source, params} = opened();
            expect(source).toBe(view);
            expect(params.encounter).not.toBe(record);
            expect(params.encounter.isCancelled()).toBe(true);
            expect(params.encounter.cancelDateTime).toBe(record.cancelDateTime);
            expect(params.editing).toBe(true);
            expect(params.individualUUID).toBe('s1');
            expectComesBackToTheCard(params.onSaveCallback);
        });
        it('runs the rule on the clone, with its date set, and not on the stored visit', () => {
            let seen;
            const getService = svc({
                rule: (form, entity) => {
                    seen = {entity, date: entity.encounterDateTime};
                    return ActionEligibilityResponse.createAllowedResponse();
                }
            });
            const before = Date.now();
            const outcome = resolveEditVisit(getService, {visitUUID: cancelledUuid});
            const after = Date.now();
            run(outcome);
            const {params} = opened();
            expect(seen.entity).toBe(params.encounter);
            expect(seen.entity).not.toBe(stored(cancelledUuid));
            expectNow(seen.date, before, after);
            expect(params.encounter.encounterDateTime).toBe(seen.date);
            expect(stored(cancelledUuid).encounterDateTime).toBeNull();
        });
        it('asks for the edit right with the profile criteria', () => {
            const getService = svc();
            run(resolveEditVisit(getService, {visitUUID: cancelledUuid}));
            expect(getService.pairsSeen).toEqual([VIEW_PAIR, editPair]);
        });
    });

    describe('planned', () => {
        it('opens one clone to be done, with the date set to now, the subject, and a save that comes back to the card', () => {
            const record = stored(plannedUuid);
            const cloneForEdit = jest.spyOn(record, 'cloneForEdit');
            const before = Date.now();
            const outcome = resolveEditVisit(svc(), {visitUUID: plannedUuid});
            const after = Date.now();
            const view = run(outcome);
            expect(cloneForEdit).toHaveBeenCalledTimes(1);
            const {source, params} = opened();
            expect(source).toBe(view);
            expect(Object.keys(params).sort()).toEqual(['editing', 'encounter', 'individualUUID', 'onSaveCallback']);
            expect(params.encounter).toBe(cloneForEdit.mock.results[0].value);
            expect(params.editing).toBe(false);
            expectNow(params.encounter.encounterDateTime, before, after);
            expect(record.encounterDateTime).toBeNull();
            expect(params.individualUUID).toBe('s1');
            expectComesBackToTheCard(params.onSaveCallback);
            expect(logEvent).not.toHaveBeenCalled();
        });
        it('asks only for the perform right, with the profile criteria', () => {
            const getService = svc();
            run(resolveEditVisit(getService, {visitUUID: plannedUuid}));
            expect(getService.pairsSeen).toEqual([VIEW_PAIR, performPair]);
        });
        it('gives the no-permission message with the edit right but not the perform right', () => {
            const getService = svc({rights: _.omit(rights, 'Perform visit')});
            expect(resolveEditVisit(getService, {visitUUID: plannedUuid})).toEqual(NO_PERMISSION);
            expect(getService.pairsSeen).toEqual([VIEW_PAIR, performPair]);
            expect(CHSNavigator.navigateToEncounterView).not.toHaveBeenCalled();
        });
        it('needs the perform right for its own visit type', () => {
            expect(resolveEditVisit(svc({rights: {...rights, 'Perform visit': ['another type']}}), {visitUUID: plannedUuid})).toEqual(NO_PERMISSION);
        });
        it('opens with the perform right and no edit right', () => {
            run(resolveEditVisit(svc({rights: _.omit(rights, 'Edit visit')}), {visitUUID: plannedUuid}));
            expect(opened().params.editing).toBe(false);
        });
        it.each([
            ['the edit rule would refuse', {rule: refusing('Locked after approval')}],
            ['no form is mapped', {forms: {}}],
        ])('opens when %s, and never looks up a form or runs the rule', (label, extra) => {
            const getService = svc(extra);
            run(resolveEditVisit(getService, {visitUUID: plannedUuid}));
            expect(opened().params.editing).toBe(false);
            expectNoFormOrRule(getService);
        });
        it('opens when the visit type is not editable', () => {
            run(resolveEditVisit(svc(), {visitUUID: lockedPlannedUuid}));
            expect(opened().params.editing).toBe(false);
        });
        it('opens with all privileges and no rights', () => {
            run(resolveEditVisit(svc({rights: {}, allPrivileges: true}), {visitUUID: plannedUuid}));
            expect(opened().params.editing).toBe(false);
        });
    });

    it.each([doneUuid, plannedUuid, lockedUuid])('needs the right to view the subject (%s) before any other check', (uuid) => {
        const getService = svc({rights: _.omit(rights, 'View subject'), forms: {}, rule: refusing('Locked after approval')});
        expect(resolveEditVisit(getService, {visitUUID: uuid})).toEqual(NO_PERMISSION);
        expect(getService.pairsSeen).toEqual([VIEW_PAIR]);
        expectNoFormOrRule(getService);
    });
});

describe("editVisit runs the rule of the form the profile picks (D6)", () => {
    it('a cancelled programme visit: its cancel form', () => {
        const getService = svc();
        run(resolveEditVisit(getService, {visitUUID: 'pCancelled'}));
        expect(getService.formMappingService.findFormForEncounterType).toHaveBeenCalledWith(ancVisit, 'ProgramEncounterCancellation', subjectType);
        const [form, entity, name] = getService.ruleEvaluationService.runEditFormRule.mock.calls[0];
        expect(form).toBe(forms.ProgramEncounterCancellation);
        expect(entity).toBe(opened().params.encounter);
        expect(name).toBe('ProgramEncounter');
    });
    it('a cancelled programme visit with no cancel form is not available', () => {
        expect(resolveEditVisit(svc({forms: _.omit(forms, 'ProgramEncounterCancellation')}), {visitUUID: 'pCancelled'})).toEqual(NOT_AVAILABLE);
    });
    it('a cancelled general visit: its visit form, not its cancel form, as the profile never sets cancel on an edit', () => {
        const getService = svc();
        run(resolveEditVisit(getService, {visitUUID: 'gCancelled'}));
        expect(getService.formMappingService.findFormForEncounterType).toHaveBeenCalledWith(homeVisit, 'Encounter', subjectType);
        const [form, entity, name] = getService.ruleEvaluationService.runEditFormRule.mock.calls[0];
        expect(form).toBe(forms.Encounter);
        expect(entity).toBe(opened().params.encounter);
        expect(name).toBe('Encounter');
    });
    it('a cancelled general visit with no visit form is not available, whatever its cancel form', () => {
        expect(resolveEditVisit(svc({forms: _.omit(forms, 'Encounter')}), {visitUUID: 'gCancelled'})).toEqual(NOT_AVAILABLE);
    });
});

describe('editVisit finds the visit first', () => {
    it.each([
        'gVoided', 'gOfVoided', 'gNoSubject',
        'pVoided', 'pOfVoidedEnrolment', 'pOfVoidedSubject', 'pOfEnrolmentWithoutSubject', 'pNoEnrolment',
        'e1', 's1', 'unknown', '', undefined, 123,
    ])('says not on this phone for %p, before any right', (uuid) => {
        const getService = svc();
        expect(resolveEditVisit(getService, {visitUUID: uuid})).toEqual(NOT_ON_PHONE);
        expect(getService.pairsSeen).toEqual([]);
        expectNoFormOrRule(getService);
    });
    it('says not on this phone when there are no args', () => {
        expect(resolveEditVisit(svc(), undefined)).toEqual(NOT_ON_PHONE);
    });
});

describe('visitTypeAllowed', () => {
    it.each([
        ['a general visit', 'Edit visit', null, 'gt1', GENERAL_EDIT_PAIR],
        ['a general visit', 'Perform visit', null, 'gt1', GENERAL_PERFORM_PAIR],
        ['a programme visit', 'Edit visit', program, 'pt1', PROGRAM_EDIT_PAIR],
        ['a programme visit', 'Perform visit', program, 'pt1', PROGRAM_PERFORM_PAIR],
    ])('asks for %s with %s, as the profile writes it', (label, privilegeName, givenProgram, typeUuid, pair) => {
        const getService = svc();
        expect(visitTypeAllowed(getService, privilegeName, subjectType, givenProgram, typeUuid)).toBe(true);
        expect(getService.pairsSeen).toEqual([pair]);
    });
    it('treats an undefined programme as a general visit', () => {
        const getService = svc();
        expect(visitTypeAllowed(getService, 'Perform visit', subjectType, undefined, 'gt1')).toBe(true);
        expect(getService.pairsSeen).toEqual([GENERAL_PERFORM_PAIR]);
    });
    it('is false when the list holds other visit types only', () => {
        expect(visitTypeAllowed(svc({rights: {'Perform visit': ['gt2']}}), 'Perform visit', subjectType, null, 'gt1')).toBe(false);
    });
    it('is false when the list is empty', () => {
        expect(visitTypeAllowed(svc({rights: {}}), 'Edit visit', subjectType, program, 'pt1')).toBe(false);
    });
    it('is true with all privileges', () => {
        expect(visitTypeAllowed(svc({rights: {}, allPrivileges: true}), 'Edit visit', subjectType, program, 'pt1')).toBe(true);
    });
});

// Reads `this`, as BaseService.getService does, so an unbound call fails here as it would on the phone.
const fakeService = (getService) => ({context: {getService}, getService(cls) {return this.context.getService(cls);}});

describe('RECORD_COMMANDS.editVisit', () => {
    it('opens the visit through the page and shows no message', () => {
        const page = fakePage();
        RECORD_COMMANDS.editVisit(fakeService(svc()), {visitUUID: 'pDone'}, page);
        expect(page.navigate).toHaveBeenCalledTimes(1);
        expect(page.showMessage).not.toHaveBeenCalled();
        const {source, params} = opened();
        expect(source).toBe(page.view);
        expect(params.editing).toBe(true);
    });
    it("shows the edit rule's message and does not navigate", () => {
        const page = fakePage();
        RECORD_COMMANDS.editVisit(fakeService(svc({rule: refusing('Locked after approval')})), {visitUUID: 'gDone'}, page);
        expect(page.showMessage).toHaveBeenCalledWith('Locked after approval');
        expect(page.navigate).not.toHaveBeenCalled();
    });
    it('shows the not-available message for a visit type that is not editable', () => {
        const page = fakePage();
        RECORD_COMMANDS.editVisit(fakeService(svc()), {visitUUID: 'gLocked'}, page);
        expect(page.showMessage).toHaveBeenCalledWith('customCardActionNotAvailable');
        expect(page.navigate).not.toHaveBeenCalled();
    });
});
