import BaseService from "../BaseService";
import Service from "../../framework/bean/Service";
import {EntityQueue, SubjectProgramEligibility, ObservationsHolder} from 'avni-models';
import General from "../../utility/General";
import _ from "lodash";

@Service("SubjectProgramEligibilityService")
class SubjectProgramEligibilityService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    getSchema() {
        return SubjectProgramEligibility.schema.name;
    }

    findBySubjectUUIDAndProgramUUID(subjectUUID, programUUID) {
        return this.findByCriteria(`subject.uuid = '${subjectUUID}' AND program.uuid = '${programUUID}' and voided = false`);
    }

    findBySubjectAndProgram(subject, program) {
        const results = this.getAllNonVoided().filtered('subject.uuid = $0 AND program.uuid = $1', subject.uuid, program.uuid).map(_.identity);
        return _.isEmpty(results) ? null : results[0];
    }

    saveOrUpdate(subjectProgramEligibility) {
        General.logDebug('SubjectProgramEligibilityService', `Saving Subject Program Eligibility UUID: ${subjectProgramEligibility.uuid}`);
        if(!_.isNil(subjectProgramEligibility.observations))
        ObservationsHolder.convertObsForSave(subjectProgramEligibility.observations);
        this.transactionManager.write(() => {
            const savedSubjectProgramEligibility = this.repository.create(subjectProgramEligibility, true);
            this.getRepository(EntityQueue.schema.name).create(EntityQueue.create(savedSubjectProgramEligibility, this.getSchema()));
        });
    }

    // No in-repo callers, but reachable from org-authored rules via getService("SubjectProgramEligibilityService")
    findBySubject(subject) {
        if (_.isNil(subject)) {
            return [];
        }
        return this.getAllNonVoided().filtered('subject.uuid = $0', subject.uuid);
    }

}

export default SubjectProgramEligibilityService;
