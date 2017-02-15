import General from "../utility/General";
import EncounterType from "./EncounterType";
import Individual from "./Individual";
import ResourceUtil from "../utility/ResourceUtil";
import _ from "lodash";
import Observation from './Observation'
import SingleCodedValue from './observation/SingleCodedValue';
import MultipleCodedValue from './observation/MultipleCodedValues';
import PrimitiveValue from "./observation/PrimitiveValue";

class Encounter {
    static schema = {
        name: 'Encounter',
        primaryKey: 'uuid',
        properties: {
            uuid: 'string',
            encounterType: 'EncounterType',
            encounterDateTime: 'date',
            individual: 'Individual',
            observations: {type: 'list', objectType: 'Observation'}
        }
    };

    static create() {
        let encounter = new Encounter();
        encounter.observations = [];
        return encounter;
    }

    static fromResource(resource, entityService) {
        const encounterType = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(resource, "encounterTypeUUID"), EncounterType.schema.name);
        const individual = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(resource, "individualUUID"), Individual.schema.name);

        const encounter = General.assignFields(resource, new Encounter(), ["uuid"], ["encounterDateTime"], ["observations"], entityService);
        encounter.encounterType = encounterType;
        encounter.individual = individual;
        return encounter;
    }

    toggleSingleSelectAnswer(concept, answerUUID) {
        return this.toggleCodedAnswer(concept, answerUUID, true);
    }

    toggleCodedAnswer(concept, answerUUID, isSingleSelect) {
        let observation = this.getObservation(concept);
        if (_.isEmpty(observation)) {
            observation = Observation.create(concept, isSingleSelect ? new SingleCodedValue(answerUUID) : new MultipleCodedValue().push(answerUUID));
            this.observations.push(observation);
            return observation;
        }
        else {
            isSingleSelect ? observation.toggleSingleSelectAnswer(answerUUID) : observation.toggleMultiSelectAnswer(answerUUID);
            if (observation.hasNoAnswer()) {
                this.observations.splice(observation);
            }
            return null;
        }
    }

    toggleMultiSelectAnswer(concept, answerUUID) {
        return this.toggleCodedAnswer(concept, answerUUID, false);
    }

    getObservation(concept) {
        return _.find(this.observations, (observation) => {
            return observation.concept.uuid === concept.uuid;
        });
    }

    addOrUpdatePrimitiveObs(concept, value) {
        const observation = this.getObservation(concept);
        if (_.isEmpty(observation) && !_.isEmpty(_.toString(value)))
            this.observations.push(Observation.create(concept, new PrimitiveValue(value)));
        else if (_.isEmpty(_.toString(value)))
            this.observations.splice(observation);
        else
            observation.setPrimitiveAnswer(value);
    }

    findObservation(concept) {
        return _.find(this.observations, (observation) => {
            return observation.concept.uuid === concept.uuid;
        });
    }

    cloneForNewEncounter() {
        const encounter = new Encounter();
        encounter.uuid = this.uuid;
        encounter.encounterType = _.isNil(this.encounterType) ? null : this.encounterType.clone();
        encounter.encounterDateTime = this.encounterDateTime;
        encounter.individual = _.isNil(this.individual) ? null : this.individual.cloneForNewEncounter();
        encounter.observations = [];
        if (!_.isNil(this.individual))
            this.observations.forEach((observation) => {
                encounter.observations.push(observation.cloneForNewEncounter());
            });
        return encounter;
    }
}

export default Encounter;