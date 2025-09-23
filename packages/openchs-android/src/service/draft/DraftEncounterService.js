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

    saveDraft(encounter) {
        const db = this.db;
        let draftEncounter = DraftEncounter.create(encounter);

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
