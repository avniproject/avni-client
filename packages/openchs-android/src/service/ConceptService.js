import BaseService from "./BaseService.js";
import Service from "../framework/bean/Service";
import {Concept, Observation} from 'avni-models';
import _ from 'lodash';
import General from "../utility/General";

@Service("conceptService")
class ConceptService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
        this.saveConcept = this.saveConcept.bind(this);
        this.getConceptByUUID = this.getConceptByUUID.bind(this);
        this.addDecisions = this.addDecisions.bind(this);
        this.addUpdateOrRemoveObs = this.addUpdateOrRemoveObs.bind(this);
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
        _.chain(decisions)
            .compact()
            .map((decision) => this.addUpdateOrRemoveObs(observations, decision))
            .value();
    }

    addUpdateOrRemoveObs(observations, decision) {
        const concept = this.conceptFor(decision.name);
        let value = this.obsValue(concept, decision);

        const existingObs = observations.find((obs) => obs.concept.name === decision.name);
        if (_.isNil(existingObs)) {
            this.addObs(value, observations, concept, decision);
        } else {
            if (this._hasValue(value)) {
                this.updateObs(existingObs, concept, value, decision);
            } else {
                _.remove(observations, (obs) => obs.concept.name === decision.name);
            }
        }
    }

    updateObs(existingObs, concept, value, decision) {
        existingObs.valueJSON = concept.getValueWrapperFor(value);
        existingObs.abnormal = _.isBoolean(decision.abnormal) ? decision.abnormal : false;
    }

    addObs(value, observations, concept, decision) {
        if (this._hasValue(value)) {
            observations.push(Observation.create(concept, concept.getValueWrapperFor(value), _.isBoolean(decision.abnormal) ? decision.abnormal : false));
        }
    }

    obsValue(concept, decision) {
        switch (concept.datatype) {
            case Concept.dataType.Coded:
                let value = [];
                decision.value.forEach((codedAnswerConceptName) => {
                    const answerConcept = this.conceptFor(codedAnswerConceptName);
                    if (!_.isNil(answerConcept)) {
                        value.push(answerConcept.uuid);
                    }
                });
                return value;
            default:
                return decision.value;
        }
    }

    conceptFor(conceptName) {
        const concept = this.findConcept(conceptName);
        if (_.isNil(concept)) General.logWarn('ConceptService', `${concept.name} doesn't exist`);
        return concept;
    }

    _hasValue(value) {
        return !this._isEmpty(value);
    }

    _isEmpty(value) {
        return General.isEmptyOrBlank(value);
    }

    getObservationsFromDecisions(decisions) {
        General.logDebug('ConceptService', decisions);
        if (!decisions) return [];

        const flattenedDecisions = _.compact(_.flatten([decisions.registrationDecisions, decisions.enrolmentDecisions, decisions.encounterDecisions]));
        const observations = [];
        this.addDecisions(observations, flattenedDecisions);
        return observations;
    }
}

export default ConceptService;