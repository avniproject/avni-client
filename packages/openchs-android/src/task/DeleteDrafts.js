import General from "../utility/General";
import {DraftSubject, DraftEncounter, DraftEnrolment, DraftProgramEncounter} from "openchs-models";
import moment from "moment";
import BaseTask from "./BaseTask";
import ErrorHandler from "../utility/ErrorHandler";
import GlobalContext from "../GlobalContext";
import _ from 'lodash';

class DeleteDrafts extends BaseTask {
    safeDelete(db, obj) {
        if (!_.isNil(obj)) {
            db.delete(obj);
        }
    }

    deleteDraftSubject(db, draft) {
        db.delete(draft.observations);
        this.safeDelete(db, draft.registrationLocation);
        db.delete(draft);
    }

    deleteDraftEncounter(db, draft) {
        db.delete(draft.observations);
        db.delete(draft.cancelObservations);
        this.safeDelete(db, draft.encounterLocation);
        this.safeDelete(db, draft.cancelLocation);
        db.delete(draft);
    }

    deleteDraftEnrolment(db, draft) {
        db.delete(draft.observations);
        db.delete(draft.programExitObservations);
        this.safeDelete(db, draft.enrolmentLocation);
        this.safeDelete(db, draft.exitLocation);
        db.delete(draft);
    }

    deleteDraftProgramEncounter(db, draft) {
        db.delete(draft.observations);
        db.delete(draft.cancelObservations);
        this.safeDelete(db, draft.encounterLocation);
        this.safeDelete(db, draft.cancelLocation);
        db.delete(draft);
    }

    async execute() {
        try {
            await this.initDependencies();

            General.logInfo("DeleteDrafts", "Starting DeleteDrafts");
            const ttl = 30;
            const ttlDate = moment().subtract(ttl, 'days').endOf('day').toDate();
            General.logInfo("DeleteDrafts", `Deleting older drafts before ${ttlDate}`);
            const db = GlobalContext.getInstance().db;

            // Delete old DraftSubject records
            const oldDraftSubjects = db.objects(DraftSubject.schema.name).filtered('updatedOn <= $0', ttlDate);
            General.logInfo("DeleteDrafts", `Found ${oldDraftSubjects.length} DraftSubject records to delete`);
            oldDraftSubjects.forEach(draft => db.write(() => this.deleteDraftSubject(db, draft)));

            // Delete old DraftEncounter records
            const oldDraftEncounters = db.objects(DraftEncounter.schema.name).filtered('updatedOn <= $0', ttlDate);
            General.logInfo("DeleteDrafts", `Found ${oldDraftEncounters.length} DraftEncounter records to delete`);
            oldDraftEncounters.forEach(draft => db.write(() => this.deleteDraftEncounter(db, draft)));

            // Delete old DraftEnrolment records
            const oldDraftEnrolments = db.objects(DraftEnrolment.schema.name).filtered('updatedOn <= $0', ttlDate);
            General.logInfo("DeleteDrafts", `Found ${oldDraftEnrolments.length} DraftEnrolment records to delete`);
            oldDraftEnrolments.forEach(draft => db.write(() => this.deleteDraftEnrolment(db, draft)));

            // Delete old DraftProgramEncounter records
            const oldDraftProgramEncounters = db.objects(DraftProgramEncounter.schema.name).filtered('updatedOn <= $0', ttlDate);
            General.logInfo("DeleteDrafts", `Found ${oldDraftProgramEncounters.length} DraftProgramEncounter records to delete`);
            oldDraftProgramEncounters.forEach(draft => db.write(() => this.deleteDraftProgramEncounter(db, draft)));

            General.logInfo("DeleteDrafts", "Completed");
        } catch (e) {
            ErrorHandler.postScheduledJobError(e);
        }
    }
}

export default new DeleteDrafts();
