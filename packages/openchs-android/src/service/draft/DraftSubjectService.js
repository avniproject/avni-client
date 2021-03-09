import BaseService from "../BaseService";
import Service from "../../framework/bean/Service";
import {DraftSubject, ObservationsHolder} from "avni-models";
import FormMappingService from "../FormMappingService";
import IdentifierAssignmentService from "../IdentifierAssignmentService";

@Service("draftSubjectService")
class DraftSubjectService extends BaseService {

    constructor(db, context) {
        super(db, context);
    }

    getSchema() {
        return DraftSubject.schema.name;
    }

    saveDraftSubject(subject) {
        const db = this.db;
        ObservationsHolder.convertObsForSave(subject.observations);
        const registrationForm = this.getService(FormMappingService).findRegistrationForm(subject.subjectType);
        this.db.write(() => {
            const saved = db.create(DraftSubject.schema.name, subject, true);
        });
    }

    deleteDraftSubjectByUUID(subjectUUID) {
        const db = this.db;
        const draftSubject = this.findByUUID(subjectUUID);
        if (draftSubject) {
            db.write(() => db.delete(draftSubject));
        }
    }
}

export default DraftSubjectService;
