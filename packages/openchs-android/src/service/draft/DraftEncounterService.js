import BaseService from '../BaseService';
import Service from '../../framework/bean/Service';
import {DraftEncounter} from 'avni-models';
<<<<<<< HEAD
import {ObservationsHolder} from 'openchs-models';
=======
import {Individual, ObservationsHolder} from 'openchs-models';
>>>>>>> master

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

        ObservationsHolder.convertObsForSave(encounter.observations);

        return this.db.write(() => {
            return db.create(DraftEncounter.schema.name, draftEncounter, true);
        });
    }

    deleteDraftByUUID(encounterUUID) {
        const db = this.db;
        const draft = this.findByUUID(encounterUUID);
        if (draft) {
            db.write(() => db.delete(draft));
        }
    }
}

export default DraftEncounterService;
