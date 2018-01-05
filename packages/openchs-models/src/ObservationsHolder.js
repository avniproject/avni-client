import _ from "lodash";
import Observation from "./Observation";
import PrimitiveValue from "./observation/PrimitiveValue";
import SingleCodedValue from "./observation/SingleCodedValue";
import MultipleCodedValues from "./observation/MultipleCodedValues";

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
        if (!_.isEmpty(observation)) {
            _.remove(this.observations, (obs) => obs.concept.uuid === observation.concept.uuid);
        }
        if (!_.isEmpty(_.toString(value))) {
            this.observations.push(Observation.create(concept, new PrimitiveValue(value, concept.datatype)));
        }
    }

    removeNonApplicableObs(allFormElements, applicableFormElements) {
        const inApplicableFormElements = _.differenceBy(allFormElements, applicableFormElements, (fe) => fe.uuid);
        inApplicableFormElements
            .map((fe) => _.remove(this.observations, (obs) => obs.concept.uuid === fe.concept.uuid));
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

    getObservationReadableValue(concept) {
        let obs = this.getObservation(concept);
        return obs ? obs.getReadableValue() : null;
    }

    addOrUpdateObservation(concept, value) {
        let observation = this.getObservation(concept);
        let valueWrapper = concept.getValueWrapperFor(value);

        if (observation)
            observation.setValue(valueWrapper);
        else
            this.observations.push(Observation.create(concept, valueWrapper));
    }
}

export default ObservationsHolder;