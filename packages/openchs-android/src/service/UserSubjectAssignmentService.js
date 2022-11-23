import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import SubjectMigrationService from "./SubjectMigrationService";
import _ from 'lodash';

@Service('UserSubjectAssignmentService')
class UserSubjectAssignmentService extends BaseService {

    constructor(db, beanStore) {
        super(db, beanStore);
    }

    init() {
        this.subjectMigrationService = this.getService(SubjectMigrationService);
    }

    deleteUnassignedSubjectsAndDependents(userSubjectAssignments) {
        _.forEach(userSubjectAssignments, ({subjectUUID}) =>
            this.subjectMigrationService.removeEntitiesFor({subjectUUID})
        );
    }

}

export default UserSubjectAssignmentService;
