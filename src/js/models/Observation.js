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

    toggleSingleSelectAnswer(answerUUID) {
        if (this.getValueWrapper().hasValue(answerUUID)) {
            this.valueJSON = {};
        } else {
            this.valueJSON = new SingleCodedValue(answerUUID);
        }
    }

    static valueAsString(observation, conceptService) {
        if (observation.concept.datatype === Concept.dataType.Date) {
            return observation.getValueWrapper().asDisplayDate();
        } else if (observation.getValueWrapper().constructor === SingleCodedValue) {
            return conceptService.getConceptByUUID(observation.getValueWrapper().getConceptUUID()).name;
        } else if (observation.getValueWrapper().constructor === MultipleCodedValues) {
            return _.join(observation.getValueWrapper().getValue().map((value) => conceptService.getConceptByUUID(value.conceptUUID).name), ', ');
        } else {
            return _.toString(observation.getValueWrapper().getValue());
        }
    }

    hasNoAnswer() {
        return _.isEmpty(this.getValueWrapper().answer);
    }

    cloneForEdit() {
        const observation = new Observation();
        observation.concept = this.concept.cloneForNewEncounter();
        observation.valueJSON = this.getValueWrapper().cloneForNewEncounter();
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