// Stand-ins for the services and records the record commands read. Not a test file: the unit project matches *Test.js.
import EntityService from "../../../src/service/EntityService";
import PrivilegeService from "../../../src/service/PrivilegeService";

const live = (uuid, extra = {}) => ({uuid, voided: false, ...extra});

export const subject = (uuid = 's1', extra = {}) => live(uuid, {subjectType: {uuid: 'st1'}, ...extra});
export const enrolment = (uuid = 'e1', subjectUuid = 's1', extra = {}) =>
    live(uuid, {individual: {uuid: subjectUuid}, program: {uuid: 'p1'}, programExitDateTime: null, ...extra});
export const visit = (uuid = 'v1', {subjectUuid = 's1', enrolmentUuid = null, ...extra} = {}) =>
    live(uuid, enrolmentUuid ? {programEnrolment: {uuid: enrolmentUuid}, ...extra} : {individual: {uuid: subjectUuid}, ...extra});

// records: {schemaName: {uuid: record}}. rights: {privilegeName: [subjectTypeUuid, ...]}.
export const servicesFor = ({records = {}, rights = {}, allPrivileges = false, forms = {}, rule, activeTypes, findByUUID} = {}) => {
    const criteriaSeen = [];
    const pairsSeen = [];
    const entityService = {
        findByUUID: jest.fn(findByUUID || ((uuid, schema) => (records[schema] || {})[uuid])),
    };
    const privilegeService = {
        hasAllPrivileges: () => allPrivileges,
        // The real one filters and maps on the field, so the list comes back only for the field the real code asks for.
        allowedEntityTypeUUIDListForCriteria: jest.fn((criteria, field) => {
            criteriaSeen.push(criteria);
            pairsSeen.push([criteria, field]);
            if (field !== 'subjectTypeUuid') return [];
            const name = /privilege\.name = '([^']*)'/.exec(criteria);
            return (name && rights[name[1]]) || [];
        }),
    };
    const beans = {EntityService: entityService, PrivilegeService: privilegeService, ...forms, ...(rule ? {RuleEvaluationService: rule} : {}), ...(activeTypes ? {activeTypes} : {})};
    const getService = (cls) => beans[cls.name];
    getService.criteriaSeen = criteriaSeen;
    getService.pairsSeen = pairsSeen;
    getService.entityService = entityService;
    return getService;
};

export const fakePage = (view = {name: 'view'}) => ({view, showMessage: jest.fn(), navigate: jest.fn(fn => fn(view))});

export {EntityService, PrivilegeService};
