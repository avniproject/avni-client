import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import Encounter from "../models/Encounter";

@Service("individualEncounterService")
class IndividualEncounterService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    getEncounters(individual) {
        const db = this.db;
        return this.db.objects(Encounter.schema.name).filtered(`individual.uuid="${individual.uuid}"`);
    }
}

export default IndividualEncounterService;