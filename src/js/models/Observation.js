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
        this.valueJSON.toggleAnswer(answerUUID);
    }

    toggleSingleSelectAnswer(answerUUID) {
        if (this.valueJSON.hasValue(answerUUID)) {
            this.valueJSON = null;
        } else {
            this.valueJSON = new SingleCodedValue(answerUUID);
        }
    }

    static valueAsString(observation, conceptService) {
        if (observation.concept.datatype === Concept.dataType.Date) {
            return observation.getValueWrapper().asDisplayDate();
        } else if (observation.getValueWrapper().constructor === SingleCodedValue) {
            return conceptService.getConceptByUUID(observation.valueJSON.getValue()).name;
        } else if (observation.getValueWrapper().constructor === MultipleCodedValues) {
            return _.join(observation.getValueWrapper().getValue().map((value) => conceptService.getConceptByUUID(value.conceptUUID).name), ', ');
        } else {
            return _.toString(observation.getValueWrapper().getValue());
        }
    }

    hasNoAnswer() {
        return _.isEmpty(this.valueJSON.answer);
    }

    setPrimitiveAnswer(value) {
        this.valueJSON.answer = value;
    }

    cloneForEdit() {
        const observation = new Observation();
        observation.concept = this.concept.cloneForNewEncounter();
        observation.valueJSON = this.valueJSON.cloneForNewEncounter();
        return observation;
    }

    getValueWrapper() {
        if (_.isString(this.valueJSON)) {
            let answer = JSON.parse(this.valueJSON).answer;
            if (this.concept.datatype === Concept.dataType.Coded) {
                return _.isArray(answer) ? new MultipleCodedValues(answer) : new SingleCodedValue(answer.conceptUUID);
            } else {
                return new PrimitiveValue(answer, this.concept.datatype);
            }
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
}

export default Observation;