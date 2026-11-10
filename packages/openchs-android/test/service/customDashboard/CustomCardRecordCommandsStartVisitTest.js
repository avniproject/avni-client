jest.mock("../../../src/utility/Analytics", () => ({__esModule: true, default: {}, logEvent: jest.fn(), firebaseEvents: {}}));
jest.mock("../../../src/utility/bugsnag", () => ({__esModule: true, default: {notify: jest.fn()}}));
jest.mock("../../../src/utility/CHSNavigator", () => ({
    __esModule: true,
    default: {proceedEncounter: jest.fn(), navigateBackAfterDoVisit: jest.fn()},
}));

import _ from "lodash";
import {Encounter, EncounterType, Individual, ProgramEncounter, ProgramEnrolment} from "avni-models";
import CHSNavigator from "../../../src/utility/CHSNavigator";
import {logEvent} from "../../../src/utility/Analytics";
import {RECORD_COMMANDS, resolveStartVisit} from "../../../src/service/customDashboard/CustomCardRecordCommands";
import {fakePage, realEnrolment, realSubject, realVisit, realVisitType, servicesFor} from "./RecordCommandFixture";

// The profile's literals with st1 and p1 put in: SubjectDashboardGeneralTab.js:76 for a general visit, and
// SubjectDashboardProgramsTab.js:393 for a programme visit.
const VIEW_PAIR = ["privilege.name = 'View subject' AND privilege.entityType = 'Subject'", 'subjectTypeUuid'];
const GENERAL_PERFORM_PAIR = ["privilege.name = 'Perform visit' AND privilege.entityType = 'Encounter' AND programUuid = null AND subjectTypeUuid = 'st1'", 'encounterTypeUuid'];
const PROGRAM_PERFORM_PAIR = ["privilege.name = 'Perform visit' AND privilege.entityType = 'Encounter' AND subjectTypeUuid = 'st1' AND programUuid = 'p1'", 'programEncounterTypeUuid'];

const NOT_ON_PHONE = {message: 'recordNotOnThisPhone'};
const NO_PERMISSION = {message: 'noPermissionForThisAction'};
const NOT_AVAILABLE = {message: 'customCardActionNotAvailable'};

const subjectType = {uuid: 'st1', name: 'Woman'};
const program = {uuid: 'p1', name: 'Pregnancy'};
const exitedOn = new Date(2026, 9, 1);
const planned = {earliestVisitDateTime: new Date(2026, 9, 5), encounterDateTime: null, cancelDateTime: null};

// The subject type's general visits use gt1 and the programme's visits use pt1. Nothing uses gt2 or pt2, though the
// user may perform them.
const activeTypes = {general: {st1: ['gt1']}, program: {p1: {st1: ['pt1']}}};
const rights = {'View subject': ['st1'], 'Perform visit': ['gt1', 'gt2', 'pt1', 'pt2']};

const world = () => {
    const s1 = realSubject('s1', {subjectType});
    const s2 = realSubject('s2', {subjectType});
    const sv = realSubject('sv', {subjectType, voided: true});
    const types = {
        gt1: realVisitType('gt1', {name: 'Home visit'}),
        gt2: realVisitType('gt2', {name: 'Health camp'}),
        pt1: realVisitType('pt1', {name: 'ANC'}),
        pt2: realVisitType('pt2', {name: 'Delivery'}),
        tv: realVisitType('tv', {name: 'Old visit', voided: true}),
    };
    const enrolments = {
        e1: realEnrolment('e1', s1, {program}),
        ex: realEnrolment('ex', s1, {program, programExitDateTime: exitedOn}),
        ev: realEnrolment('ev', s1, {program, voided: true}),
        eOther: realEnrolment('eOther', s2, {program}),
        exOther: realEnrolment('exOther', s2, {program, programExitDateTime: exitedOn}),
        eOfVoided: realEnrolment('eOfVoided', sv, {program}),
        eNoSubject: realEnrolment('eNoSubject', realSubject('missing', {subjectType}), {program}),
    };
    return {s1, types, enrolments, records: {Individual: {s1, s2, sv}, ProgramEnrolment: enrolments, EncounterType: types}};
};

let w;
const svc = (extra = {}) => servicesFor({records: w.records, rights, activeTypes, ...extra});

beforeEach(() => {
    jest.clearAllMocks();
    w = world();
});

const run = (outcome, view = {v: 1}) => {
    expect(typeof outcome.navigate).toBe('function');
    outcome.navigate(view);
    return view;
};

// The one call to proceedEncounter, which takes the visit or its type, the parent, the save callback and the source.
const started = () => {
    const proceed = CHSNavigator.proceedEncounter;
    expect(proceed).toHaveBeenCalledTimes(1);
    expect(proceed.mock.calls[0]).toHaveLength(4);
    const [visitOrType, parent, onSaveCallback, source] = proceed.mock.calls[0];
    return {visitOrType, parent, onSaveCallback, source};
};

const expectComesBackToTheCard = (onSaveCallback) => {
    const saveSource = {name: 'the visit summary'};
    onSaveCallback(saveSource, 'anything else');
    const calls = CHSNavigator.navigateBackAfterDoVisit.mock.calls;
    expect(calls).toHaveLength(1);
    expect(calls[0]).toHaveLength(1);
    expect(calls[0][0]).toBe(saveSource);
};

const expectNoTypeLookup = (getService) => {
    expect(getService.formMappingService.findActiveEncounterTypesForEncounter).not.toHaveBeenCalled();
    expect(getService.formMappingService.findActiveEncounterTypesForProgram).not.toHaveBeenCalled();
};

const expectNothingAsked = (getService) => {
    expect(getService.pairsSeen).toEqual([]);
    expectNoTypeLookup(getService);
};

describe.each([
    {kind: 'general', args: {subjectUUID: 's1', visitTypeUUID: 'gt1'}, parentOf: () => w.s1, ParentClass: Individual,
        VisitClass: Encounter, performPair: GENERAL_PERFORM_PAIR, unusedTypeUuid: 'gt2', otherKindTypeUuid: 'pt1'},
    {kind: 'programme', args: {subjectUUID: 's1', visitTypeUUID: 'pt1', enrolmentUUID: 'e1'}, parentOf: () => w.enrolments.e1, ParentClass: ProgramEnrolment,
        VisitClass: ProgramEncounter, performPair: PROGRAM_PERFORM_PAIR, unusedTypeUuid: 'pt2', otherKindTypeUuid: 'gt1'},
])('startVisit, a $kind visit', ({args, parentOf, ParentClass, VisitClass, performPair, unusedTypeUuid, otherKindTypeUuid}) => {
    const visitType = () => w.types[args.visitTypeUUID];

    it('starts a new visit when none of the type is planned: proceedEncounter gets the visit type and the parent when the page navigates, with a save that comes back to the card', () => {
        const outcome = resolveStartVisit(svc(), args);
        expect(CHSNavigator.proceedEncounter).not.toHaveBeenCalled();

        const view = run(outcome);
        const {visitOrType, parent, onSaveCallback, source} = started();
        expect(visitOrType).toBe(visitType());
        expect(visitOrType).toBeInstanceOf(EncounterType);
        expect(parent).toBe(parentOf());
        expect(parent).toBeInstanceOf(ParentClass);
        expect(source).toBe(view);
        expectComesBackToTheCard(onSaveCallback);
        expect(logEvent).not.toHaveBeenCalled();
    });
    it('starts the planned visit of the type, and not one that is done, cancelled, voided, of another type or without an earliest date', () => {
        const parentRecord = parentOf();
        realVisit('done', parentRecord, visitType(), {...planned, encounterDateTime: new Date(2026, 9, 6)});
        realVisit('cancelled', parentRecord, visitType(), {...planned, cancelDateTime: new Date(2026, 9, 6)});
        realVisit('voided', parentRecord, visitType(), {...planned, voided: true});
        realVisit('ofAnotherType', parentRecord, w.types[unusedTypeUuid], planned);
        realVisit('noEarliestDate', parentRecord, visitType(), {...planned, earliestVisitDateTime: null});
        const plannedVisit = realVisit('planned', parentRecord, visitType(), planned);

        run(resolveStartVisit(svc(), args));
        const {visitOrType, parent, onSaveCallback} = started();
        // The parent's list wraps each record again on every read, so the visit is a new object around the planned record.
        expect(visitOrType).toBeInstanceOf(VisitClass);
        expect(visitOrType.that).toBe(plannedVisit.that);
        expect(parent).toBe(parentRecord);
        expectComesBackToTheCard(onSaveCallback);
    });
    it('starts the planned visit due earliest, even when a later-due one comes first in the list', () => {
        realVisit('later', parentOf(), visitType(), planned);
        const earlier = realVisit('earlier', parentOf(), visitType(), {...planned, earliestVisitDateTime: new Date(2026, 8, 1)});
        run(resolveStartVisit(svc(), args));
        expect(started().visitOrType.that).toBe(earlier.that);
    });
    it('starts the first in list order when planned visits are due at the same time', () => {
        const first = realVisit('first', parentOf(), visitType(), planned);
        realVisit('second', parentOf(), visitType(), {...planned});
        run(resolveStartVisit(svc(), args));
        expect(started().visitOrType.that).toBe(first.that);
    });
    it('asks for the view right, then the perform right, with the profile criteria', () => {
        const getService = svc();
        run(resolveStartVisit(getService, args));
        expect(getService.pairsSeen).toEqual([VIEW_PAIR, performPair]);
    });
    it.each([
        ['a new visit', () => null],
        ['a planned visit', () => realVisit('planned', parentOf(), visitType(), planned)],
    ])('gives the no-permission message for %s without the right to perform the type', (label, arrange) => {
        arrange();
        const getService = svc({rights: _.omit(rights, 'Perform visit')});
        expect(resolveStartVisit(getService, args)).toEqual(NO_PERMISSION);
        expect(getService.pairsSeen).toEqual([VIEW_PAIR, performPair]);
        expect(CHSNavigator.proceedEncounter).not.toHaveBeenCalled();
    });
    it('needs the perform right for its own visit type', () => {
        expect(resolveStartVisit(svc({rights: {...rights, 'Perform visit': ['another type']}}), args)).toEqual(NO_PERMISSION);
    });
    it('starts with all privileges and no rights', () => {
        run(resolveStartVisit(svc({rights: {}, allPrivileges: true}), args));
        expect(started().visitOrType).toBe(visitType());
    });
    it('needs the right to view the subject before the visit types in use or the perform right', () => {
        const getService = svc({rights: _.omit(rights, 'View subject')});
        expect(resolveStartVisit(getService, args)).toEqual(NO_PERMISSION);
        expect(getService.pairsSeen).toEqual([VIEW_PAIR]);
        expectNoTypeLookup(getService);
    });
    it.each([
        ['a type nothing uses', unusedTypeUuid],
        ['a type of the other kind of visit', otherKindTypeUuid],
    ])('is not available for %s, even with the perform right, before the perform right is asked', (label, visitTypeUUID) => {
        const getService = svc();
        expect(resolveStartVisit(getService, {...args, visitTypeUUID})).toEqual(NOT_AVAILABLE);
        expect(getService.pairsSeen).toEqual([VIEW_PAIR]);
        expect(CHSNavigator.proceedEncounter).not.toHaveBeenCalled();
    });
    it('is not available for a type the record does not use, even with all privileges', () => {
        expect(resolveStartVisit(svc({rights: {}, allPrivileges: true}), {...args, visitTypeUUID: unusedTypeUuid})).toEqual(NOT_AVAILABLE);
    });
    it('is not available for a type the record does not use, even when a visit of that type is planned', () => {
        realVisit('plannedOfUnusedType', parentOf(), w.types[unusedTypeUuid], planned);
        expect(resolveStartVisit(svc(), {...args, visitTypeUUID: unusedTypeUuid})).toEqual(NOT_AVAILABLE);
    });
});

describe('startVisit asks which visit types the record uses', () => {
    it("for a general visit, the subject type's", () => {
        const getService = svc();
        run(resolveStartVisit(getService, {subjectUUID: 's1', visitTypeUUID: 'gt1'}));
        const lookup = getService.formMappingService.findActiveEncounterTypesForEncounter;
        expect(lookup).toHaveBeenCalledTimes(1);
        expect(lookup.mock.calls[0]).toHaveLength(1);
        expect(lookup.mock.calls[0][0].uuid).toBe('st1');
        expect(getService.formMappingService.findActiveEncounterTypesForProgram).not.toHaveBeenCalled();
    });
    it("for a programme visit, the programme's for the subject type", () => {
        const getService = svc();
        run(resolveStartVisit(getService, {subjectUUID: 's1', visitTypeUUID: 'pt1', enrolmentUUID: 'e1'}));
        const lookup = getService.formMappingService.findActiveEncounterTypesForProgram;
        expect(lookup).toHaveBeenCalledTimes(1);
        expect(lookup.mock.calls[0]).toHaveLength(2);
        const [givenProgram, givenSubjectType] = lookup.mock.calls[0];
        expect(givenProgram.uuid).toBe('p1');
        expect(givenSubjectType.uuid).toBe('st1');
        expect(getService.formMappingService.findActiveEncounterTypesForEncounter).not.toHaveBeenCalled();
    });
});

// A new visit only for a type the eligibility rule allows, as the profile lists the types it offers
// (IndividualGeneralHistoryActions.js:35-37, StartProgramActions.js:47-48 and :55-56). A planned visit runs no rule, as the profile's Do button does.
describe('startVisit and the eligibility rule', () => {
    const general = {subjectUUID: 's1', visitTypeUUID: 'gt1'};
    const programme = {subjectUUID: 's1', visitTypeUUID: 'pt1', enrolmentUUID: 'e1'};
    const refuses = () => false;

    it.each([['general visit', general], ['programme visit', programme]])
    ('is not available for a new %s the rule refuses, and does not navigate', (label, args) => {
        expect(resolveStartVisit(svc({eligible: refuses}), args)).toEqual(NOT_AVAILABLE);
        expect(CHSNavigator.proceedEncounter).not.toHaveBeenCalled();
    });
    it.each([['general visit', general], ['programme visit', programme]])
    ('asks the rule once, with the subject and the visit type, before starting a new %s', (label, args) => {
        const getService = svc();
        run(resolveStartVisit(getService, args));
        const isEligible = getService.ruleEvaluationService.isEligibleForEncounter;
        expect(isEligible).toHaveBeenCalledTimes(1);
        expect(isEligible.mock.calls[0]).toHaveLength(2);
        expect(isEligible.mock.calls[0][0]).toBe(w.s1);
        expect(isEligible.mock.calls[0][1]).toBe(w.types[args.visitTypeUUID]);
        expect(started().visitOrType).toBe(w.types[args.visitTypeUUID]);
    });
    it.each([
        ['a planned general visit', general, () => realVisit('gPlanned', w.s1, w.types.gt1, planned)],
        ['a planned programme visit', programme, () => realVisit('pPlanned', w.enrolments.e1, w.types.pt1, planned)],
    ])('starts %s the rule would refuse, and never runs the rule', (label, args, arrange) => {
        const plannedVisit = arrange();
        const getService = svc({eligible: refuses});
        run(resolveStartVisit(getService, args));
        expect(started().visitOrType.that).toBe(plannedVisit.that);
        expect(getService.ruleEvaluationService.isEligibleForEncounter).not.toHaveBeenCalled();
    });
    it.each([undefined, null, 0, ''])('refuses when the rule gives %p, as the profile drops the type', (given) => {
        expect(resolveStartVisit(svc({eligible: () => given}), general)).toEqual(NOT_AVAILABLE);
    });
    it.each([1, 'yes', {}])('starts when the rule gives %p, as the profile keeps the type', (given) => {
        run(resolveStartVisit(svc({eligible: () => given}), general));
        expect(started().visitOrType).toBe(w.types.gt1);
    });
    it.each([
        ['without the view right', {rights: _.omit(rights, 'View subject')}, general, NO_PERMISSION],
        ['without the perform right', {rights: _.omit(rights, 'Perform visit')}, general, NO_PERMISSION],
        ['for a type the record does not use', {}, {...general, visitTypeUUID: 'gt2'}, NOT_AVAILABLE],
        ['for an exited enrolment', {}, {...programme, enrolmentUUID: 'ex'}, NOT_AVAILABLE],
    ])('does not run the rule %s', (label, extra, args, outcome) => {
        const getService = svc({eligible: refuses, ...extra});
        expect(resolveStartVisit(getService, args)).toEqual(outcome);
        expect(getService.ruleEvaluationService.isEligibleForEncounter).not.toHaveBeenCalled();
    });
});

describe('startVisit finds the subject and the visit type first', () => {
    it.each([
        ['a voided subject', {subjectUUID: 'sv'}],
        ['a subject not on the phone', {subjectUUID: 'unknown'}],
        ["an enrolment's uuid as the subject", {subjectUUID: 'e1'}],
        ['an empty subject uuid', {subjectUUID: ''}],
        ['no subject uuid', {subjectUUID: undefined}],
        ['a number as the subject uuid', {subjectUUID: 123}],
        ['a voided visit type', {visitTypeUUID: 'tv'}],
        ['a visit type not on the phone', {visitTypeUUID: 'unknown'}],
        ["a subject's uuid as the visit type", {visitTypeUUID: 's1'}],
        ['an empty visit type uuid', {visitTypeUUID: ''}],
        ['no visit type uuid', {visitTypeUUID: undefined}],
        ['a number as the visit type uuid', {visitTypeUUID: 123}],
    ])('says not on this phone for %s, before any right', (label, change) => {
        const getService = svc();
        expect(resolveStartVisit(getService, {subjectUUID: 's1', visitTypeUUID: 'gt1', ...change})).toEqual(NOT_ON_PHONE);
        expectNothingAsked(getService);
    });
    it('says not on this phone for a voided visit type on a programme visit', () => {
        expect(resolveStartVisit(svc(), {subjectUUID: 's1', visitTypeUUID: 'tv', enrolmentUUID: 'e1'})).toEqual(NOT_ON_PHONE);
    });
    it('says not on this phone when there are no args', () => {
        expect(resolveStartVisit(svc(), undefined)).toEqual(NOT_ON_PHONE);
    });
});

// A named enrolment is a record, checked with the subject before any right. Whether it has exited is its state, which
// only a user who may see the subject is told (D3).
describe('startVisit with a named enrolment', () => {
    const programmeArgs = (enrolmentUUID) => ({subjectUUID: 's1', visitTypeUUID: 'pt1', enrolmentUUID});
    it.each([
        ["another subject's enrolment", 'eOther'],
        ["another subject's exited enrolment", 'exOther'],
        ['a voided enrolment', 'ev'],
        ['an enrolment whose subject is voided', 'eOfVoided'],
        ['an enrolment whose subject is not on the phone', 'eNoSubject'],
        ['an enrolment not on the phone', 'unknown'],
        ["the subject's own uuid", 's1'],
        ["a visit type's uuid", 'pt1'],
        ['a number as the enrolment uuid', 123],
        ['the text nullish', 'nullish'],
    ])('says not on this phone for %s, before any right', (label, enrolmentUUID) => {
        const getService = svc();
        expect(resolveStartVisit(getService, programmeArgs(enrolmentUUID))).toEqual(NOT_ON_PHONE);
        expectNothingAsked(getService);
    });
    it("gives the no-permission message for the subject's exited enrolment to a user who may not view the subject", () => {
        const getService = svc({rights: _.omit(rights, 'View subject')});
        expect(resolveStartVisit(getService, programmeArgs('ex'))).toEqual(NO_PERMISSION);
        expect(getService.pairsSeen).toEqual([VIEW_PAIR]);
        expectNoTypeLookup(getService);
    });
    it("is not available for the subject's exited enrolment to a user who may view the subject, before the visit types in use or the perform right", () => {
        const getService = svc();
        expect(resolveStartVisit(getService, programmeArgs('ex'))).toEqual(NOT_AVAILABLE);
        expect(getService.pairsSeen).toEqual([VIEW_PAIR]);
        expectNoTypeLookup(getService);
    });
    it.each(['', 'null', 'undefined'])('is not available for a visit type only a programme uses, when the enrolment uuid is %p', (enrolmentUUID) => {
        const getService = svc();
        expect(resolveStartVisit(getService, programmeArgs(enrolmentUUID))).toEqual(NOT_AVAILABLE);
        expect(getService.pairsSeen).toEqual([VIEW_PAIR]);
        expect(getService.formMappingService.findActiveEncounterTypesForEncounter).toHaveBeenCalledTimes(1);
        expect(getService.formMappingService.findActiveEncounterTypesForProgram).not.toHaveBeenCalled();
    });
    it('still starts a programme visit for a real enrolment', () => {
        run(resolveStartVisit(svc(), programmeArgs('e1')));
        expect(started().parent).toBe(w.enrolments.e1);
    });
    it('is not available for an exited enrolment, even with all privileges', () => {
        expect(resolveStartVisit(svc({allPrivileges: true}), programmeArgs('ex'))).toEqual(NOT_AVAILABLE);
    });
    it.each([null, undefined, '', 'null', 'undefined'])('starts a general visit on the subject when the enrolment uuid is %p, as a card template writes a missing enrolment', (enrolmentUUID) => {
        run(resolveStartVisit(svc(), {subjectUUID: 's1', visitTypeUUID: 'gt1', enrolmentUUID}));
        const {visitOrType, parent} = started();
        expect(visitOrType).toBe(w.types.gt1);
        expect(parent).toBe(w.s1);
    });
});

// The database wraps a row anew on every lookup, so the subject read for the command and the one read again through the
// enrolment are two objects around one record.
describe('startVisit when every lookup gives a new object, as the database does', () => {
    const freshEachTime = (uuid, schema) => {
        const record = (w.records[schema] || {})[uuid];
        return record == null ? record : new record.constructor(record.that);
    };
    it.each([
        ['a general visit', {subjectUUID: 's1', visitTypeUUID: 'gt1'}, () => w.s1, Individual],
        ['a programme visit', {subjectUUID: 's1', visitTypeUUID: 'pt1', enrolmentUUID: 'e1'}, () => w.enrolments.e1, ProgramEnrolment],
    ])('starts %s, matching the records by uuid', (label, args, parentOf, ParentClass) => {
        run(resolveStartVisit(svc({findByUUID: freshEachTime}), args));
        const {visitOrType, parent} = started();
        expect(visitOrType).toBeInstanceOf(EncounterType);
        expect(visitOrType.that).toBe(w.types[args.visitTypeUUID].that);
        expect(parent).toBeInstanceOf(ParentClass);
        expect(parent.that).toBe(parentOf().that);
    });
    it("still says not on this phone for another subject's enrolment", () => {
        expect(resolveStartVisit(svc({findByUUID: freshEachTime}), {subjectUUID: 's1', visitTypeUUID: 'pt1', enrolmentUUID: 'eOther'})).toEqual(NOT_ON_PHONE);
    });
});

// Reads `this`, as BaseService.getService does, so an unbound call fails here as it would on the phone.
const fakeService = (getService) => ({context: {getService}, getService(cls) {return this.context.getService(cls);}});

describe('RECORD_COMMANDS.startVisit', () => {
    it('starts the visit through the page and shows no message', () => {
        const page = fakePage();
        RECORD_COMMANDS.startVisit(fakeService(svc()), {subjectUUID: 's1', visitTypeUUID: 'pt1', enrolmentUUID: 'e1'}, page);
        expect(page.navigate).toHaveBeenCalledTimes(1);
        expect(page.showMessage).not.toHaveBeenCalled();
        const {visitOrType, parent, source} = started();
        expect(source).toBe(page.view);
        expect(visitOrType).toBe(w.types.pt1);
        expect(parent).toBe(w.enrolments.e1);
    });
    it('shows the not-available message when the eligibility rule refuses a new visit, and does not navigate', () => {
        const page = fakePage();
        RECORD_COMMANDS.startVisit(fakeService(svc({eligible: () => false})), {subjectUUID: 's1', visitTypeUUID: 'pt1', enrolmentUUID: 'e1'}, page);
        expect(page.showMessage).toHaveBeenCalledWith('customCardActionNotAvailable');
        expect(page.navigate).not.toHaveBeenCalled();
    });
    it('shows the not-available message for an exited enrolment and does not navigate', () => {
        const page = fakePage();
        RECORD_COMMANDS.startVisit(fakeService(svc()), {subjectUUID: 's1', visitTypeUUID: 'pt1', enrolmentUUID: 'ex'}, page);
        expect(page.showMessage).toHaveBeenCalledWith('customCardActionNotAvailable');
        expect(page.navigate).not.toHaveBeenCalled();
    });
    it('shows the no-permission message without the perform right and does not navigate', () => {
        const page = fakePage();
        RECORD_COMMANDS.startVisit(fakeService(svc({rights: _.omit(rights, 'Perform visit')})), {subjectUUID: 's1', visitTypeUUID: 'gt1'}, page);
        expect(page.showMessage).toHaveBeenCalledWith('noPermissionForThisAction');
        expect(page.navigate).not.toHaveBeenCalled();
    });
});
