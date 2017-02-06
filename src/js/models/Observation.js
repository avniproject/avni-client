import _ from "lodash";
import Concept from './Concept';
import moment from "moment";
import SingleCodedValue from "./observation/SingleCodedValue";
import MultipleCodedValues from "./observation/MultipleCodedValues";

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
            return _.join(observation.valueJSON.getValues().map((value) => conceptService.getConceptByUUID(value).name), ', ');
        } else {
            return observation.valueJSON.getDisplayValue();
        }
    }

    hasNoAnswer() {
        return _.isEmpty(this.valueJSON.answer)
    }

    setPrimitiveAnswer(value) {
        this.valueJSON.answer = value;
    }
}

export default Observation;