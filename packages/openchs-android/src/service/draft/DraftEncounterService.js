import BaseService from '../BaseService';
import Service from '../../framework/bean/Service';
import {DraftEncounter} from 'avni-models';
import {ObservationsHolder} from 'openchs-models';

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
        ObservationsHolder.convertObsForSave(encounter.observations);
        return this.db.write(() => {
            return db.create(DraftEncounter.schema.name, DraftEncounter.create(encounter), true);
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
