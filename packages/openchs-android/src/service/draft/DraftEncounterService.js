import BaseService from '../BaseService';
import Service from '../../framework/bean/Service';
import {DraftEncounter} from 'avni-models';
import {Individual, ObservationsHolder} from 'openchs-models';

@Service("draftEncounterService")
class DraftEncounterService extends BaseService {

    constructor(db, context) {
        super(db, context);
    }

    getSchema() {
        return DraftEncounter.schema.name;
    }

    listUnScheduledDrafts(individual) {
        return individual? this.findAll().filtered(`individual.uuid="${individual.uuid}" AND earliestVisitDateTime == null`) : [];
    }

    /**
     * List all draft encounters for a given individual (both scheduled and unscheduled)
     * @param {Individual} individual
     * @returns {Results<DraftEncounter>}
     */
    listDraftsForIndividual(individual) {
        return individual ?
            this.findAll().filtered(`individual.uuid="${individual.uuid}"`) : [];
    }

    /**
     * Find draft by individual and encounter type (for unscheduled encounters)
     * @param {Individual} individual
     * @param {EncounterType} encounterType
     * @param {Date} earliestVisitDateTime
     * @returns {DraftEncounter|null}
     */
    findByIndividualAndEncounterType(individual, encounterType, earliestVisitDateTime = null) {
        if (!individual || !encounterType) return null;
        const query = earliestVisitDateTime 
            ? `individual.uuid="${individual.uuid}" AND encounterType.uuid="${encounterType.uuid}" AND earliestVisitDateTime == $0`
            : `individual.uuid="${individual.uuid}" AND encounterType.uuid="${encounterType.uuid}" AND earliestVisitDateTime == null`;
        const drafts = this.findAll().filtered(query, earliestVisitDateTime);
        return drafts.length > 0 ? drafts[0] : null;
    }

    /**
     * Find draft for an encounter - handles both scheduled and unscheduled encounters
     * Uses individual + encounterType + earliestVisitDateTime combination for lookup
     * @param {Encounter} encounter
     * @returns {DraftEncounter|null}
     */
    findDraftFor(encounter) {
        if (!encounter) return null;
        return this.findByIndividualAndEncounterType(encounter.individual, encounter.encounterType, encounter.earliestVisitDateTime);
    }

    saveDraft(encounter) {
        const db = this.db;
        
        // Find existing draft - handles both scheduled and unscheduled encounters
        const existingDraft = this.findDraftFor(encounter);
        
        let draftEncounter = DraftEncounter.create(encounter);
        
        // If existing draft found, use its UUID to update instead of creating new
        if (existingDraft) {
            draftEncounter.uuid = existingDraft.uuid;
        }

        const cleanIndividualFromDB = this.findByUUID(encounter.individual.uuid, Individual.schema.name);
        draftEncounter.individual = cleanIndividualFromDB;

        ObservationsHolder.convertObsForSave(draftEncounter.observations);

        return this.db.write(() => {
            return db.create(DraftEncounter.schema.name, draftEncounter, Realm.UpdateMode.Modified);
        });
    }

    deleteDraftByUUID(encounterUUID) {
        const db = this.db;
        const draft = this.findByUUID(encounterUUID);
        if (draft) {
            db.write(() => {
                    db.delete(draft.observations);
                    db.delete(draft.cancelObservations);

                    this.safeDelete(draft.encounterLocation);
                    this.safeDelete(draft.cancelLocation);

                    db.delete(draft);
                }
            );
        }
    }
}

export default DraftEncounterService;
