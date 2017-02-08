import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import Encounter from "../models/Encounter";
import Individual from "../models/Individual";
import EncounterType from "../models/EncounterType";
import IndividualService from "./IndividualService";
import ConceptService from "./ConceptService";
import Observation from "../models/Observation";
import PrimitiveValue from "../models/observation/PrimitiveValue";

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

    newEncounter(individualUUID) {
        const encounter = Encounter.create();
        encounter.individual = this.getService(IndividualService).findByUUID(individualUUID, Individual.schema.name);
        encounter.encounterType = this.getAll(EncounterType.schema.name)[0];
        return encounter;
    }

    addDecisions(encounter, decisions) {
        decisions.forEach((decision) => {
            var concept = this.getService(ConceptService).findByKey('name', decision.name);
            encounter.observations.push(Observation.create(concept, new PrimitiveValue(decision.value)));
        });
    }
}

export default IndividualEncounterService;