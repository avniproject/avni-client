// Stand-ins for the services and records the record commands read. Not a test file: the unit project matches *Test.js.
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
export const visit = (uuid = 'v1', {subjectUuid = 's1', enrolmentUuid = null, ...extra} = {}) =>
    live(uuid, enrolmentUuid ? {programEnrolment: {uuid: enrolmentUuid}, ...extra} : {individual: {uuid: subjectUuid}, ...extra});

// The field the profile passes for each privilege. The stub answers only for that field, so a resolver passing another
// one gets nothing, even where the real query would still find rows (an enrolment row also holds its subject type).
const PRIVILEGE_FIELD = {
    'View subject': 'subjectTypeUuid',
    'Edit subject': 'subjectTypeUuid',
    'Edit enrolment details': 'programUuid',
};

// records: {schemaName: {uuid: record}}. rights: {privilegeName: [uuid of the kind its field holds, ...]}.
// forms: {formType: form}, the form mapped for each Form.formTypes value. rule: (form, entity, entityName) => response.
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
            if (!name || PRIVILEGE_FIELD[name[1]] !== field) return [];
            return rights[name[1]] || [];
        }),
        // The real method, over the stubbed list above.
        hasActionPrivilegeForCriteria: PrivilegeService.prototype.hasActionPrivilegeForCriteria,
    };
    const formMappingService = {
        findRegistrationForm: jest.fn(() => forms.IndividualProfile),
        findFormForProgramEnrolment: jest.fn(() => forms.ProgramEnrolment),
        findFormForProgramExit: jest.fn(() => forms.ProgramExit),
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
