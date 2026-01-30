import BaseService from '../BaseService';
import Service from '../../framework/bean/Service';
import {DraftProgramEncounter} from 'avni-models';
import {ObservationsHolder, ProgramEnrolment} from 'openchs-models';

@Service("draftProgramEncounterService")
class DraftProgramEncounterService extends BaseService {

    constructor(db, context) {
        super(db, context);
    }

    getSchema() {
        return DraftProgramEncounter.schema.name;
    }

    /**
     * List unscheduled draft program encounters for a given program enrolment
     * (drafts without earliestVisitDateTime - unplanned program encounters)
     * @param {ProgramEnrolment} programEnrolment
     * @returns {Results<DraftProgramEncounter>}
     */
    listUnScheduledDrafts(programEnrolment) {
        return programEnrolment ?
            this.findAll().filtered(`programEnrolment.uuid="${programEnrolment.uuid}" AND earliestVisitDateTime == null`) : [];
    }

    /**
     * List all draft program encounters for a given program enrolment (both scheduled and unscheduled)
     * @param {ProgramEnrolment} programEnrolment
     * @returns {Results<DraftProgramEncounter>}
     */
    listDraftsForEnrolment(programEnrolment) {
        return programEnrolment ?
            this.findAll().filtered(`programEnrolment.uuid="${programEnrolment.uuid}"`) : [];
    }

    /**
     * Find draft by enrolment and encounter type (for unscheduled encounters)
     * @param {ProgramEnrolment} programEnrolment
     * @param {EncounterType} encounterType
     * @param {Date} earliestVisitDateTime
     * @returns {DraftProgramEncounter|null}
     */
    findByEnrolmentAndEncounterType(programEnrolment, encounterType, earliestVisitDateTime = null) {
        if (!programEnrolment || !encounterType) return null;
        const query = earliestVisitDateTime 
            ? `programEnrolment.uuid="${programEnrolment.uuid}" AND encounterType.uuid="${encounterType.uuid}" AND earliestVisitDateTime == $0`
            : `programEnrolment.uuid="${programEnrolment.uuid}" AND encounterType.uuid="${encounterType.uuid}" AND earliestVisitDateTime == null`;
        const drafts = this.findAll().filtered(query, earliestVisitDateTime);
        return drafts.length > 0 ? drafts[0] : null;
    }

    /**
     * Find draft for a program encounter - handles both scheduled and unscheduled encounters
     * Uses enrolment + encounterType + earliestVisitDateTime combination for lookup
     * @param {ProgramEncounter} programEncounter
     * @returns {DraftProgramEncounter|null}
     */
    findDraftFor(programEncounter) {
        if (!programEncounter) return null;
        return this.findByEnrolmentAndEncounterType(programEncounter.programEnrolment, programEncounter.encounterType, programEncounter.earliestVisitDateTime);
    }

    /**
     * Save a program encounter as draft
     * @param {ProgramEncounter} programEncounter
     * @returns {DraftProgramEncounter}
     */
    saveDraft(programEncounter) {
        const db = this.db;
        
        // Find existing draft - handles both scheduled and unscheduled encounters
        const existingDraft = this.findDraftFor(programEncounter);
        
        let draftProgramEncounter = DraftProgramEncounter.create(programEncounter);
        
        // If existing draft found, use its UUID to update instead of creating new
        if (existingDraft) {
            draftProgramEncounter.uuid = existingDraft.uuid;
        }

        // Get clean programEnrolment reference from DB to avoid detached object issues
        const cleanEnrolmentFromDB = this.findByUUID(programEncounter.programEnrolment.uuid, ProgramEnrolment.schema.name);
        draftProgramEncounter.programEnrolment = cleanEnrolmentFromDB;

        // Convert observations for Realm storage
        ObservationsHolder.convertObsForSave(draftProgramEncounter.observations);
        ObservationsHolder.convertObsForSave(draftProgramEncounter.cancelObservations);

        return this.db.write(() => {
            return db.create(DraftProgramEncounter.schema.name, draftProgramEncounter, Realm.UpdateMode.Modified);
        });
    }

    /**
     * Delete a draft program encounter with cascading deletion of observations and locations
     * @param {string} programEncounterUUID
     */
    deleteDraftByUUID(programEncounterUUID) {
        const db = this.db;
        const draft = this.findByUUID(programEncounterUUID);
        if (draft) {
            db.write(() => {
                db.delete(draft.observations);
                db.delete(draft.cancelObservations);

                this.safeDelete(draft.encounterLocation);
                this.safeDelete(draft.cancelLocation);

                db.delete(draft);
            });
        }
    }
}

export default DraftProgramEncounterService;
