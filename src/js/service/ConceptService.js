import BaseService from "./BaseService.js";
import Service from "../framework/bean/Service";
import Concept from "../models/Concept";
import _ from 'lodash';
import Observation from "../models/Observation";
import General from "../utility/General";

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
        decisions = decisions || [];
        decisions.forEach((decision) => {
            const concept = this.findConcept(decision.name);
            if (_.isNil(concept)) General.logWarn('ConceptService', `${concept.name} doesn't exist`);

            const existingObs = observations.find((obs) => obs.concept.name === decision.name);
            var value;
            if (concept.datatype === Concept.dataType.Coded) {
                value = [];
                decision.value.forEach((codedAnswerConceptName) => {
                    const answerConcept = this.findConcept(codedAnswerConceptName);
                    if (_.isNil(answerConcept))
                        General.logWarn('ConceptService', `${concept.name} doesn't exist`);
                    else
                        value.push(answerConcept.uuid);
                });
            } else {
                value = decision.value;
            }

            if (_.isNil(existingObs)) {
                //isEmpty returns true if its date(e.g. EDD)
                if (!_.isEmpty(decision.value) || _.isDate(decision.value)) {
                    observations.push(Observation.create(concept, concept.getValueWrapperFor(value)));
                }
            } else {
                if (_.isNil(decision.value)) {
                    _.remove(observations, (obs) => obs.concept.name === decision.name);
                } else {
                    existingObs.valueJSON = concept.getValueWrapperFor(value);
                }
            }
        });
    }

    getObservationsFromDecisions(decisions) {
        General.logDebugObject('ConceptService', decisions);
        if (!decisions) return [];

        const flattenedDecisions = _.compact(_.flatten([decisions.registrationDecisions, decisions.enrolmentDecisions, decisions.encounterDecisions]));
        const observations = [];
        this.addDecisions(observations, flattenedDecisions);
        return observations;
    }
}

export default ConceptService;