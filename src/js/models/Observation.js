import _ from "lodash";
import Concept from './Concept';

class Observation {
    static schema = {
        name: 'Observation',
        properties: {
            concept: 'Concept',
            valueJSON: 'string'
        }
    };

    static create(concept, value) {
        const observation = new Observation();
        observation.concept = concept;
        observation.valueJSON = value;
        return observation;
    }

    toggleMultiSelectAnswer(answerUUID) {
        this.getValueWrapper().toggleAnswer(answerUUID);
    }

    static valueAsString(observation, conceptService, I18n) {
        return observation.getValueWrapper().valueAsString(conceptService, I18n);
    }
    
    toggleSingleSelectAnswer(answerUUID) {
        if (this.getValueWrapper().hasValue(answerUUID)) {
            this.valueJSON = {};
        } else {
            this.valueJSON = new CodedAnswers(answerUUID);
        }
    }


    hasNoAnswer() {
        return _.isEmpty(this.getValueWrapper().answer);
    }

    cloneForEdit() {
        const observation = new Observation();
        observation.concept = this.concept.cloneForReference();
        observation.valueJSON = this.getValueWrapper().cloneForEdit();
        return observation;
    }

    getValueWrapper() {
        if (_.isString(this.valueJSON)) {
            let answer = JSON.parse(this.valueJSON).answer;
            return this.concept.getValueWrapperFor(answer);
        }
        else return this.valueJSON;
    }

    get toResource() {
        const obsResource = {conceptUUID: this.concept.uuid};
        if (this.concept.datatype === Concept.dataType.Coded)
            obsResource.valueCoded = this.getValueWrapper().toResource;
        else
            obsResource.valuePrimitive = this.getValueWrapper().toResource;
        return obsResource;
    }

    getValue() {
        return this.getValueWrapper().getValue();
    }
}

export default Observation;