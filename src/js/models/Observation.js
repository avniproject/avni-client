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
            return observation.valueJSON.asDisplayDate();
        } else if (observation.valueJSON.constructor === SingleCodedValue) {
            return conceptService.getConceptByUUID(observation.valueJSON.getValue()).name;
        } else if (observation.valueJSON.constructor === MultipleCodedValues) {
            return _.join(observation.getValue().map((value) => conceptService.getConceptByUUID(value.conceptUUID).name), ', ');
        } else {
            return observation.valueJSON.getValue();
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

    getValue() {
        if (_.isString(this.valueJSON)) {
            let answer = JSON.parse(this.valueJSON).answer;
            console.log(`${this.valueJSON} ${_.isArray(answer)} ${this.concept.datatype}`);
            if (this.concept.datatype === Concept.dataType.Coded) {
                return _.isArray(answer) ? new MultipleCodedValues(answer) : new SingleCodedValue(answer.conceptUUID);
            } else {
                return new PrimitiveValue(answer, this.concept.datatype);
            }
        }
        else return this.valueJSON.getValue();
    }

    get toResource() {
        const obsResource = {conceptUUID: this.concept.uuid};
        if (this.concept.datatype === Concept.dataType.Coded)
            obsResource.valueCoded = this.getValue().toResource;
        else
            obsResource.valuePrimitive = this.getValue().toResource;
        return obsResource;
    }
}

export default Observation;