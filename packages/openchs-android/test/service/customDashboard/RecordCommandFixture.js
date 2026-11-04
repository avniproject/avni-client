// Stand-ins for the services and records the record commands read. Not a test file: the unit project matches *Test.js.
import _ from "lodash";
import {ActionEligibilityResponse} from "rules-config";
import {Encounter, EncounterType, Individual, ProgramEncounter, ProgramEnrolment} from "avni-models";
import EntityService from "../../../src/service/EntityService";
import PrivilegeService from "../../../src/service/PrivilegeService";

const live = (uuid, extra = {}) => ({uuid, voided: false, ...extra});

// Real avni-models instances, for the start command: CHSNavigator.proceedEncounter tells a visit from a visit type, and
// a subject from an enrolment, by instanceof (CHSNavigator.js:720-723). Each wraps a plain record, as a database row is
// wrapped. A parent's list wraps its records again on every read (RealmListProxy.pushAll), so a visit read through its
// parent is a new object around the same record.
export const realVisitType = (uuid, extra = {}) => new EncounterType({uuid, name: uuid, voided: false, ...extra});
export const realSubject = (uuid = 's1', extra = {}) => new Individual(live(uuid, {subjectType: {uuid: 'st1'}, encounters: [], ...extra}));
export const realEnrolment = (uuid, subject, extra = {}) =>
    new ProgramEnrolment(live(uuid, {individual: subject.that, program: {uuid: 'p1'}, programExitDateTime: null, encounters: [], ...extra}));
// A visit put on its parent's list: an Encounter on a subject, a ProgramEncounter on an enrolment. It points back to the
// parent by uuid only. The parent itself would close a loop, and jest-worker sends a failed test's values as JSON.
export const realVisit = (uuid, parent, encounterType, extra = {}) => {
    const isProgramVisit = parent instanceof ProgramEnrolment;
    const VisitClass = isProgramVisit ? ProgramEncounter : Encounter;
    const visit = new VisitClass(live(uuid, {
        [isProgramVisit ? 'programEnrolment' : 'individual']: {uuid: parent.uuid},
        encounterType: encounterType.that, earliestVisitDateTime: null, encounterDateTime: null, cancelDateTime: null, ...extra,
    }));
    parent.that.encounters.push(visit.that);
    return visit;
};

// A subject type's settings, as the model's getSetting reads them: a key that is not set gives undefined.
export const subjectTypeWith = (fields = {}, settings = {}) => ({uuid: 'st1', getSetting: (key) => settings[key], ...fields});

export const subject = (uuid = 's1', extra = {}) => live(uuid, {subjectType: subjectTypeWith(), ...extra});
// isActive mirrors the model's getter: no exit date.
export const enrolment = (uuid = 'e1', subjectUuid = 's1', extra = {}) => {
    const record = live(uuid, {individual: {uuid: subjectUuid}, program: {uuid: 'p1'}, programExitDateTime: null, ...extra});
    return {isActive: record.programExitDateTime == null, ...record};
};

// The visit methods the edit reads, as openchs-models has them: isCancelled and isScheduled (AbstractEncounter.js:255-260),
// and cloneForEdit, a new object on each call with the same fields and parent and a copy of the type (:170-182).
// The clone takes no own functions, so a spy on the stored visit stays off its clone.
const VISIT_METHODS = {
    isCancelled() {return !!this.cancelDateTime;},
    isScheduled() {return _.isNil(this.encounterDateTime) && _.isNil(this.cancelDateTime);},
    cloneForEdit() {
        return withVisitMethods({..._.omitBy(this, _.isFunction), encounterType: _.isNil(this.encounterType) ? null : {...this.encounterType}});
    },
};
const withVisitMethods = (fields) => Object.assign(Object.create(VISIT_METHODS), fields);
export const visit = (uuid = 'v1', {subjectUuid = 's1', enrolmentUuid = null, ...extra} = {}) =>
    withVisitMethods(live(uuid, enrolmentUuid ? {programEnrolment: {uuid: enrolmentUuid}, ...extra} : {individual: {uuid: subjectUuid}, ...extra}));

// A visit right's field depends on the kind of visit, which its criteria name. A general visit's says programUuid = null
// (SubjectDashboardGeneralTab.js:76, :95). A programme visit's names the programme (SubjectDashboardProgramsTab.js:247, :393).
const visitField = (criteria) => /programUuid = null/.test(criteria) ? 'encounterTypeUuid' : 'programEncounterTypeUuid';

// The field the profile passes for each privilege. The stub answers only for that field, so a resolver passing another
// one gets nothing, even where the real query would still find rows (an enrolment row also holds its subject type).
const PRIVILEGE_FIELD = {
    'View subject': 'subjectTypeUuid',
    'Edit subject': 'subjectTypeUuid',
    'Edit enrolment details': 'programUuid',
    'Edit visit': visitField,
    'Perform visit': visitField,
};
const profileField = (privilegeName, criteria) => {
    const field = PRIVILEGE_FIELD[privilegeName];
    return _.isFunction(field) ? field(criteria) : field;
};

// The real lookups read each visit type from the database again, so they never give back the object the caller holds.
const freshVisitTypes = (uuids = []) => uuids.map(uuid => new EncounterType({uuid}));

// records: {schemaName: {uuid: record}}. rights: {privilegeName: [uuid of the kind its field holds, ...]}.
// forms: {formType: form}, the form mapped for each Form.formTypes value, whatever the visit type.
// rule: (form, entity, entityName) => response.
// activeTypes: the visit types in use, {general: {subjectTypeUuid: [uuid, ...]}, program: {programUuid: {subjectTypeUuid: [uuid, ...]}}}.
// The lookups answer only for the subject type and programme they are given.
export const servicesFor = ({records = {}, rights = {}, allPrivileges = false, forms = {}, rule, activeTypes = {}, findByUUID} = {}) => {
    const criteriaSeen = [];
    const pairsSeen = [];
    const entityService = {
        findByUUID: jest.fn(findByUUID || ((uuid, schema) => (records[schema] || {})[uuid])),
    };
    const privilegeService = {
        hasAllPrivileges: () => allPrivileges,
        allowedEntityTypeUUIDListForCriteria: jest.fn((criteria, field) => {
            criteriaSeen.push(criteria);
            pairsSeen.push([criteria, field]);
            const name = /privilege\.name = '([^']*)'/.exec(criteria);
            if (!name || profileField(name[1], criteria) !== field) return [];
            return rights[name[1]] || [];
        }),
        // The real method, over the stubbed list above.
        hasActionPrivilegeForCriteria: PrivilegeService.prototype.hasActionPrivilegeForCriteria,
    };
    const formMappingService = {
        findRegistrationForm: jest.fn(() => forms.IndividualProfile),
        findFormForProgramEnrolment: jest.fn(() => forms.ProgramEnrolment),
        findFormForProgramExit: jest.fn(() => forms.ProgramExit),
        findFormForEncounterType: jest.fn((encounterType, formType) => forms[formType]),
        findActiveEncounterTypesForEncounter: jest.fn((subjectType) => freshVisitTypes(_.get(activeTypes, ['general', subjectType.uuid]))),
        findActiveEncounterTypesForProgram: jest.fn((program, subjectType) =>
            freshVisitTypes(_.get(activeTypes, ['program', program.uuid, subjectType.uuid]))),
    };
    // With no rule the real one allows, as it does for a form with no edit rule. The eligibility rule refuses every
    // visit type, so a start that ran it would be refused (D5: a start never runs it).
    const ruleEvaluationService = {
        runEditFormRule: jest.fn(rule || (() => ActionEligibilityResponse.createAllowedResponse())),
        isEligibleForEncounter: jest.fn(() => false),
    };
    const beans = {
        EntityService: entityService,
        PrivilegeService: privilegeService,
        FormMappingService: formMappingService,
        RuleEvaluationService: ruleEvaluationService,
    };
    const getService = (cls) => beans[cls.name];
    getService.criteriaSeen = criteriaSeen;
    getService.pairsSeen = pairsSeen;
    getService.entityService = entityService;
    getService.formMappingService = formMappingService;
    getService.ruleEvaluationService = ruleEvaluationService;
    return getService;
};

export const fakePage = (view = {name: 'view'}) => ({view, showMessage: jest.fn(), navigate: jest.fn(fn => fn(view))});

export {EntityService, PrivilegeService};
