import _ from "lodash";
import Observation from "./Observation";
import PrimitiveValue from "./observation/PrimitiveValue";
import CodedAnswers from "./observation/CodedAnswers";

class ObservationsHolder {
    constructor(observations) {
        this.observations = observations;
    }

    findObservation(concept) {
        return _.find(this.observations, (observation) => {
            return observation.concept.uuid === concept.uuid;
        });
    }

    getObservation(concept) {
        return _.find(this.observations, (observation) => {
            return observation.concept.uuid === concept.uuid;
        });
    }

    addOrUpdatePrimitiveObs(concept, value) {
        const observation = this.getObservation(concept);
        if(!_.isEmpty(observation)) {
            _.remove(this.observations, (obs) => obs.concept.uuid === observation.concept.uuid);
        }
        if (!_.isEmpty(_.toString(value))) {
            this.observations.push(Observation.create(concept, new PrimitiveValue(value, concept.datatype)));
        }
    }

    toggleCodedAnswer(concept, answerUUID, isSingleSelect) {
        let observation = this.getObservation(concept);
        if (_.isEmpty(observation)) {
            observation = Observation.create(concept, new CodedAnswers(answerUUID));
            this.observations.push(observation);
            return observation;
        } else {
            isSingleSelect ? observation.toggleCodedAnswer(answerUUID, answerUUID, true) : observation.toggleCodedAnswer(answerUUID, answerUUID, false);
            if (observation.hasNoAnswer()) {
                _.remove(this.observations, (obs) => obs.concept.uuid === observation.concept.uuid);
                return null;
            }
            return observation;
        }
    }

    static clone(observations) {
        const newObservations = [];
        observations.forEach((observation) => {
            newObservations.push(observation.cloneForEdit());
        });
        return newObservations;
    }

    static convertObsForSave(observations) {
        observations.forEach((observation) => {
            observation.valueJSON = JSON.stringify(observation.valueJSON);
        });
    }


}

export default ObservationsHolder;