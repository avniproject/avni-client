import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import Encounter from "../models/Encounter";
import Individual from "../models/Individual";
import EncounterType from "../models/EncounterType";
import IndividualService from "./IndividualService";
import ConceptService from "./ConceptService";
import Observation from "../models/Observation";
import PrimitiveValue from "../models/observation/PrimitiveValue";
import _ from 'lodash';
import G from '../utility/General';
import EntityQueue from "../models/EntityQueue";

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
        encounter.uuid = G.randomUUID();
        encounter.individual = this.getService(IndividualService).findByUUID(individualUUID, Individual.schema.name);
        encounter.encounterType = this.getAll(EncounterType.schema.name)[0];
        return encounter;
    }

    addDecisions(encounter, decisions) {
        decisions.forEach((decision) => {
            var concept = this.getService(ConceptService).findByKey('name', decision.name);
            if (_.isNil(concept))
                throw Error(`No concept found for ${decision.name} when adding observations for decisions`);
            encounter.observations.push(Observation.create(concept, new PrimitiveValue(decision.value)));
        });
    }

    saveOrUpdate(encounter) {
        encounter.encounterDateTime = new Date();
        encounter.observations.forEach((observation) => {
            observation.valueJSON = JSON.stringify(observation.valueJSON);
        });

        const db = this.db;
        this.db.write(()=> {
            db.create(Encounter.schema.name, encounter, true);
            db.create(EntityQueue.schema.name, EntityQueue.create(encounter, Encounter.schema.name));
        });
        return encounter;
    }
}

export default IndividualEncounterService;