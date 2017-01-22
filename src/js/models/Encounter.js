import General from "../utility/General";
import EncounterType from "./EncounterType";
import Individual from "./Individual";
import ResourceUtil from "../utility/ResourceUtil";
import _ from "lodash";
import Observation from './Observation'

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
            observation = Observation.create(concept, {conceptUUID: answerUUID});
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
            observation = Observation.create(concept, [{conceptUUID: answerUUID}]);
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

}

export default Encounter;