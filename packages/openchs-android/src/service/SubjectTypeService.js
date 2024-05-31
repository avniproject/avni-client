import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import {SubjectType} from "avni-models";
import _ from 'lodash';
import PrivilegeService from "./PrivilegeService";
import {Privilege} from "openchs-models";

@Service("subjectTypeService")
class SubjectTypeService extends BaseService {
    constructor(db, context) {
        super(db, context);
    }

    getSchema() {
        return SubjectType.schema.name;
    }

    getAllSubjectTypesWithIcon() {
        return this.getAllNonVoided().filtered('iconFileS3Key <> null').map(_.identity);
    }

    getAllDirectlyAssignable() {
        return this.getAllNonVoided().filtered('directlyAssignable = true').map(_.identity);
    }

    getAllowedSubjectTypes() {
        const privilegeService = this.getService(PrivilegeService);
        const viewSubjectCriteria = `privilege.name = '${Privilege.privilegeName.viewSubject}' AND privilege.entityType = '${Privilege.privilegeEntityType.subject}'`;
        const allowedSubjectTypeUUIDs = privilegeService.allowedEntityTypeUUIDListForCriteria(viewSubjectCriteria, 'subjectTypeUuid');
        return _.filter(this.loadAllNonVoided(), subjectType => privilegeService.hasAllPrivileges() || _.includes(allowedSubjectTypeUUIDs, subjectType.uuid));
    }
}

export default SubjectTypeService
