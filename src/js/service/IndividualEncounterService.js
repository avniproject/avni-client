import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import Encounter from "../models/Encounter";
import EncounterType from "../models/EncounterType";

@Service("individualEncounterService")
class IndividualEncounterService extends BaseService {
    constructor(db, context) {
        super(db, context);
    }

    getEncounters(individual) {
        const db = this.db;
        return this.db.objects(Encounter.schema.name).filtered(`individual.uuid="${individual.uuid}"`);
    }

    newEncounter(individual) {
        const encounter = Encounter.create();
        encounter.individual = individual;
        encounter.encounterType = this.getAll(EncounterType.schema.name)[0];
        return encounter;
    }
}

export default IndividualEncounterService;