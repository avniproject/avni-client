import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import Encounter from "../models/Encounter";
import Individual from "../models/Individual";
import EntityQueue from "../models/EntityQueue";
import ObservationsHolder from "../models/ObservationsHolder";

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
        });
        return encounter;
    }
}

export default IndividualEncounterService;