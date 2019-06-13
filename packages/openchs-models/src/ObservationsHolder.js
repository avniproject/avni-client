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

    findObservationByValue(value) {
        return _.find(this.observations, (observation) => observation.getValue() === value);
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
        return _.flatten(
            inApplicableFormElements
                .map((fe) => _.remove(this.observations, (obs) => obs.concept.uuid === fe.concept.uuid)));
    }

    updatePrimitiveObs(applicableFormElements, formElementStatuses) {
        applicableFormElements.forEach((fe) => {
            let value = _.find(formElementStatuses, (formElementStatus) => {
                return fe.uuid === formElementStatus.uuid;
            }).value;
            if (!_.isNil(value)) {
                this.addOrUpdatePrimitiveObs(fe.concept, value);
            }
        })
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

    updateCompositeDurationValue(concept, duration) {
        let observation = this.getObservation(concept);
        if (!_.isEmpty(observation)) {
            _.remove(this.observations, (obs) => obs.concept.uuid === observation.concept.uuid);
            if (duration.isEmpty) return null;
        }
        observation = Observation.create(concept, duration);
        this.observations.push(observation);
        return observation;
    }

    toggleMultiSelectAnswer(concept, answerUUID) {
        return this.toggleCodedAnswer(concept, answerUUID, false);
    }

    static clone(observations) {
        return _.map(observations, o => o.cloneForEdit());
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

    updateObservationBasedOnValue(oldValue, newValue) {
        const observation = this.findObservationByValue(oldValue);
        if (observation) {
            observation.setValue(observation.concept.getValueWrapperFor(newValue));
        }
    }

    toString(I18n) {
        let display = '';
        this.observations.forEach((obs) => {
            display += `${I18n.t(obs.concept.name)}: ${obs.getReadableValue()}\n`;
        });
        return display;
    }
}

export default ObservationsHolder;
