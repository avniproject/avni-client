// Stand-ins for the services and records the record commands read. Not a test file: the unit project matches *Test.js.
import _ from "lodash";
import {ActionEligibilityResponse} from "rules-config";
import EntityService from "../../../src/service/EntityService";
import PrivilegeService from "../../../src/service/PrivilegeService";

const live = (uuid, extra = {}) => ({uuid, voided: false, ...extra});

export const subject = (uuid = 's1', extra = {}) => live(uuid, {subjectType: {uuid: 'st1'}, ...extra});
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

// records: {schemaName: {uuid: record}}. rights: {privilegeName: [uuid of the kind its field holds, ...]}.
// forms: {formType: form}, the form mapped for each Form.formTypes value, whatever the visit type.
// rule: (form, entity, entityName) => response.
export const servicesFor = ({records = {}, rights = {}, allPrivileges = false, forms = {}, rule, activeTypes, findByUUID} = {}) => {
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
    };
    // With no rule the real one allows, as it does for a form with no edit rule.
    const ruleEvaluationService = {
        runEditFormRule: jest.fn(rule || (() => ActionEligibilityResponse.createAllowedResponse())),
    };
    const beans = {
        EntityService: entityService,
        PrivilegeService: privilegeService,
        FormMappingService: formMappingService,
        RuleEvaluationService: ruleEvaluationService,
        ...(activeTypes ? {activeTypes} : {}),
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
