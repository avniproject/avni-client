import BaseService from "../BaseService";
import Service from "../../framework/bean/Service";
import {Program} from 'openchs-models';
import PrivilegeService from "../PrivilegeService";
import {Privilege} from "openchs-models";
import _ from "lodash";
import FormMappingService from "../FormMappingService";

function getAllowedViewProgramUUIDs(subjectType, privilegeService) {
    const viewProgramCriteria = `privilege.name = '${Privilege.privilegeName.viewEnrolmentDetails}' AND privilege.entityType = '${Privilege.privilegeEntityType.enrolment}' AND subjectTypeUuid = '${subjectType.uuid}'`;
    return privilegeService.allowedEntityTypeUUIDListForCriteria(viewProgramCriteria, 'programUuid');
}

@Service("ProgramService")
class ProgramService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    getSchema() {
        return Program.schema.name;
    }

    allPrograms() {
        return this.findAll(Program.schema.name);
    }

    get programsAvailable() {
        return this.allPrograms().length > 0;
    }

    getAllowedViewPrograms(subjectTypes) {
        const privilegeService = this.getService(PrivilegeService);
        const allowedProgramUUIDs = _.reduce(subjectTypes, (acc, subjectType) => _.union(acc, getAllowedViewProgramUUIDs(subjectType, privilegeService)));
        const formMappingService = this.getService(FormMappingService);
        const programs = formMappingService.findProgramsForSubjectTypes(subjectTypes);
        return _.filter(programs, x => privilegeService.hasAllPrivileges() || _.includes(allowedProgramUUIDs, x.uuid));
    }
}

export default ProgramService;
