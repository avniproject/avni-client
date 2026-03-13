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
        ObservationsHolder.convertObsForSave(subject.observations);
        const registrationForm = this.getService(FormMappingService).findRegistrationForm(subject.subjectType);
        this.transactionManager.write(() => {
            this.repository.create(subject, Realm.UpdateMode.Modified);
            this.getService(IdentifierAssignmentService).assignPopulatedIdentifiersFromObservations(registrationForm, subject.observations);
        });
    }

    deleteDraftSubjectByUUID(subjectUUID) {
        const draftSubject = this.findByUUID(subjectUUID);
        if (draftSubject) {
            this.transactionManager.write(() => {
                this.db.delete(draftSubject.observations);
                this.safeDelete(draftSubject.registrationLocation);
                this.db.delete(draftSubject);
            });
        }
    }
}

export default DraftSubjectService;
