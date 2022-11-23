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
        const results = this.getAllNonVoided().filtered('subject = $0 AND program = $1', subject, program).map(_.identity);
        return _.isEmpty(results) ? null : results[0];
    }

    saveOrUpdate(subjectProgramEligibility) {
        General.logDebug('SubjectProgramEligibilityService', `Saving Subject Program Eligibility UUID: ${subjectProgramEligibility.uuid}`);
        if(!_.isNil(subjectProgramEligibility.observations))
        ObservationsHolder.convertObsForSave(subjectProgramEligibility.observations);
        const db = this.db;
        this.db.write(() => {
            const savedSubjectProgramEligibility = db.create(this.getSchema(), subjectProgramEligibility, true);
            db.create(EntityQueue.schema.name, EntityQueue.create(savedSubjectProgramEligibility, this.getSchema()));
        });
    }

    findBySubject(subject) {
        return this.getAllNonVoided().filtered('subject = $0', subject)
    }

}

export default SubjectProgramEligibilityService;
