import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import {Encounter, Individual, EntityQueue, ObservationsHolder} from "openchs-models";
import MediaQueueService from "./MediaQueueService";

@Service("individualEncounterService")
class IndividualEncounterService extends BaseService {
    constructor(db, context) {
        super(db, context);
    }

    getSchema() {
        return Encounter.schema.name;
    }

    getEncounters(individual) {
        const db = this.db;
        return this.db.objects(Encounter.schema.name).filtered(`individual.uuid="${individual.uuid}"`);
    }

    saveOrUpdate(encounter) {
        ObservationsHolder.convertObsForSave(encounter.observations);
        const db = this.db;
        this.db.write(()=> {
            db.create(Encounter.schema.name, encounter, true);

            const loadedEncounter = this.findByUUID(encounter.uuid, Encounter.schema.name);
            const individual = this.findByUUID(encounter.individual.uuid, Individual.schema.name);
            individual.addEncounter(loadedEncounter);

            db.create(EntityQueue.schema.name, EntityQueue.create(encounter, Encounter.schema.name));
            this.getService(MediaQueueService).addMediaToQueue(encounter, Encounter.schema.name);
        });
        return encounter;
    }
}

export default IndividualEncounterService;
