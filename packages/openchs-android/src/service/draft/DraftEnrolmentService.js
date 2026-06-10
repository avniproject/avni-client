import BaseService from '../BaseService';
import Service from '../../framework/bean/Service';
import {DraftEnrolment} from 'avni-models';
import {Individual, ObservationsHolder, Program} from 'openchs-models';
import UpdateMode from "../../repository/UpdateMode";

@Service("draftEnrolmentService")
class DraftEnrolmentService extends BaseService {

    constructor(db, context) {
        super(db, context);
    }

    getSchema() {
        return DraftEnrolment.schema.name;
    }

    /**
     * List all draft enrolments for a given individual
     * @param {Individual} individual
     * @returns {Results<DraftEnrolment>}
     */
    listDraftsForIndividual(individual) {
        return individual ? this.findAll().filtered(`individual.uuid="${individual.uuid}"`) : [];
    }

    /**
     * Find draft by individual and program
     * @param {Individual} individual
     * @param {Program} program
     * @returns {DraftEnrolment|null}
     */
    findByIndividualAndProgram(individual, program) {
        if (!individual || !program) return null;
        const drafts = this.findAll().filtered(
            `individual.uuid="${individual.uuid}" AND program.uuid="${program.uuid}"`
        );
        return drafts.length > 0 ? drafts[0] : null;
    }

    /**
     * Save a program enrolment as draft
     * @param {ProgramEnrolment} enrolment
     * @returns {DraftEnrolment}
     */
    saveDraft(enrolment) {
        // Find existing draft for same individual + program to update it
        const existingDraft = this.findByIndividualAndProgram(enrolment.individual, enrolment.program);

        let draftEnrolment = DraftEnrolment.create(enrolment);

        // If existing draft found, use its UUID to update instead of creating new
        if (existingDraft) {
            draftEnrolment.uuid = existingDraft.uuid;
        }

        // Get clean references from DB to avoid detached object issues
        const cleanIndividualFromDB = this.findByUUID(enrolment.individual.uuid, Individual.schema.name);
        draftEnrolment.individual = cleanIndividualFromDB;

        const cleanProgramFromDB = this.findByUUID(enrolment.program.uuid, Program.schema.name);
        draftEnrolment.program = cleanProgramFromDB;

        // Convert observations for Realm storage
        ObservationsHolder.convertObsForSave(draftEnrolment.observations);
        ObservationsHolder.convertObsForSave(draftEnrolment.programExitObservations);

        return this.transactionManager.write(() => {
            return this.repository.create(draftEnrolment, UpdateMode.Modified);
        });
    }

    /**
     * Delete a draft enrolment with cascading deletion of observations and locations
     * @param {string} enrolmentUUID
     */
    deleteDraftByUUID(enrolmentUUID) {
        const draft = this.findByUUID(enrolmentUUID);
        if (draft) {
            this.transactionManager.write(() => {
                this.repository.deleteInTransaction(draft.observations);
                this.repository.deleteInTransaction(draft.programExitObservations);

                this.safeDelete(draft.enrolmentLocation);
                this.safeDelete(draft.exitLocation);

                this.repository.deleteInTransaction(draft);
            });
        }
    }
}

export default DraftEnrolmentService;
