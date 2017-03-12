import _ from "lodash";
import BaseEntity from "./BaseEntity";
import Observation from "./Observation";
import PrimitiveValue from "./observation/PrimitiveValue";
import SingleCodedValue from "./observation/SingleCodedValue";
import MultipleCodedValues from "./observation/MultipleCodedValues";

class ObservationsHolder extends BaseEntity {
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

    toggleSingleSelectAnswer(concept, answerUUID) {
        return this.toggleCodedAnswer(concept, answerUUID, true);
    }

    toggleCodedAnswer(concept, answerUUID, isSingleSelect) {
        let observation = this.getObservation(concept);
        if (_.isEmpty(observation)) {
            observation = Observation.create(concept, isSingleSelect ? new SingleCodedValue(answerUUID) : new MultipleCodedValues().push(answerUUID));
            this.observations.push(observation);
            return observation;
        } else {
            isSingleSelect ? observation.toggleSingleSelectAnswer(answerUUID) : observation.toggleMultiSelectAnswer(answerUUID);
            if (observation.hasNoAnswer()) {
                _.remove(this.observations, (obs) => obs.concept.uuid === observation.concept.uuid);
                return null;
            }
            return observation;
        }
    }

    toggleMultiSelectAnswer(concept, answerUUID) {
        return this.toggleCodedAnswer(concept, answerUUID, false);
    }

    clone(observationsHolder) {
        observationsHolder.observations = [];
        this.observations.forEach((observation) => {
            observationsHolder.observations.push(observation.cloneForEdit());
        });
    }

    convertObsForSave() {
        this.observations.forEach((observation) => {
            observation.valueJSON = JSON.stringify(observation.valueJSON);
        });
    }
}

export default ObservationsHolder;