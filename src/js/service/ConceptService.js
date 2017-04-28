import BaseService from "./BaseService.js";
import Service from "../framework/bean/Service";
import Concept from "../models/Concept";
import _ from 'lodash';
import Observation from "../models/Observation";
import PrimitiveValue from "../models/observation/PrimitiveValue";

@Service("conceptService")
class ConceptService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
        this.saveConcept = this.saveConcept.bind(this);
        this.getConceptByUUID = this.getConceptByUUID.bind(this);
    }

    getSchema() {
        return Concept.schema.name;
    }

    getConceptByUUID(conceptUUID) {
        return this.db.objectForPrimaryKey(Concept.schema.name, conceptUUID);
    }

    getConceptByName(conceptName) {
        return this.db.objects(Concept.schema.name).filtered(`name = \"${conceptName}\"`)[0];
    }

    saveConcept(concept) {
        const db = this.db;
        this.db.write(() => db.create(Concept.schema.name, concept, true));
        return concept;
    }

    findConcept(name) {
        const concept = this.findByKey('name', name);
        if (_.isNil(concept))
            throw Error(`No concept found for ${name}`);
        return concept;
    }

    addDecisions(observations, decisions) {
        decisions.forEach((decision) => {
            const concept = this.findConcept(decision.name);

            if (!_.isNil(decision.value)) {
                var value = decision.value;
                if (concept.datatype === Concept.dataType.Coded) {
                    value = this.findConcept(value).uuid;
                }
                observations.push(Observation.create(concept, concept.getValueWrapperFor(value)));
            }
        });
    }

    getObservationsFromDecisions(decisions) {
        const observations = [];
        this.addDecisions(observations, decisions);
        return observations;
    }
}

export default ConceptService;