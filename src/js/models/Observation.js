import _ from "lodash";
import Concept from './Concept';
import moment from "moment";
import SingleCodedValue from "./observation/SingleCodedValue";
import MultipleCodedValues from "./observation/MultipleCodedValues";
import PrimitiveValue from "./observation/PrimitiveValue";

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
            this.valueJSON = new SingleCodedValue(answerUUID);
        }
    }

    static valueAsString(observation, conceptService) {
        const valueWrapper = observation.getValueWrapper();

        if (observation.concept.datatype === Concept.dataType.Date) {
            return valueWrapper.asDisplayDate();
        } else if (valueWrapper.isSingleCoded) {
            return conceptService.getConceptByUUID(valueWrapper.getConceptUUID()).name;
        } else if (valueWrapper.isMultipleCoded) {
            return _.join(valueWrapper.getValue().map((value) => {
                return conceptService.getConceptByUUID(value).name;
            }), ', ');
        } else {
            return _.toString(valueWrapper.getValue());
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
        return {conceptUUID: this.concept.uuid, value: this.getValueWrapper().toResource};
    }

    getValue() {
        return this.getValueWrapper().getValue();
    }
}

export default Observation;