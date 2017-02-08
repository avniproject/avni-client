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
        let observation = this.getObservation(concept);
        if (_.isEmpty(observation)) {
            observation = Observation.create(concept, new SingleCodedValue(answerUUID));
            this.observations.push(observation);
        }
        else {
            observation.toggleSingleSelectAnswer(answerUUID);
            if (observation.hasNoAnswer()) {
                this.observations.splice(observation);
            }
        }
    }

    toggleMultiSelectAnswer(concept, answerUUID) {
        let observation = this.getObservation(concept);
        if (_.isEmpty(observation)) {
            observation = Observation.create(concept, new MultipleCodedValue().push(answerUUID));
            this.observations.push(observation);
        }
        else {
            observation.toggleMultiSelectAnswer(answerUUID);
            if (observation.hasNoAnswer()) {
                this.observations.splice(observation);
            }
        }
    }

    getObservation(concept){
        return _.find(this.observations, (observation) => {
            return observation.concept.uuid === concept.uuid;
        });
    }

    addOrUpdatePrimitiveObs(concept, value) {
        const observation = this.getObservation(concept);
        if (_.isEmpty(observation))
            this.observations.push(Observation.create(concept, new PrimitiveValue(value)));
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
        encounter.encounterType = this.encounterType.clone();
        encounter.encounterDateTime = this.encounterDateTime;
        encounter.individual = this.individual.cloneForNewEncounter();
        encounter.observations = [];
        this.observations.forEach((observation) => {
            encounter.observations.push(observation.cloneForNewEncounter());
        });
        return encounter;
    }
}

export default Encounter;