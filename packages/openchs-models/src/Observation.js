import _ from "lodash";
import Concept from './Concept';
import SingleCodedValue from "./observation/SingleCodedValue";

class Observation {
    static schema = {
        name: 'Observation',
        properties: {
            concept: 'Concept',
            valueJSON: 'string'
        }
    };

    static create(concept, value, abnormal = false) {
        const observation = new Observation();
        observation.concept = concept;
        observation.valueJSON = value;
        observation.abnormal = abnormal;
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

    static valueAsString(observation, conceptService, i18n) {
        const valueWrapper = observation.getValueWrapper();

        if (observation.concept.datatype === Concept.dataType.Date) {
            return valueWrapper.asDisplayDate();
        } else if (valueWrapper.isSingleCoded) {
            return i18n.t(conceptService.getConceptByUUID(valueWrapper.getConceptUUID()).name);
        } else if (valueWrapper.isMultipleCoded) {
            return _.join(valueWrapper.getValue().map((value) => {
                return i18n.t(conceptService.getConceptByUUID(value).name);
            }), ', ');
        } else if (observation.concept.datatype === Concept.dataType.Duration) {
            return _.toString(valueWrapper.toString(i18n));
        } else {
            const unit = _.defaultTo(observation.concept.unit, "");
            return _.toString(`${valueWrapper.getValue()} ${unit}`);
        }
    }

    isAbnormal() {
        //This is to support the old version of app where observation are being set explicitly true.
        // Developer is just being lazy here.
        if (this.abnormal === true) {
            return true;
        }
        return this.concept.isAbnormal(this.getValue());
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
            let valueParsed = JSON.parse(this.valueJSON);
            if (this.concept.isCodedConcept()) {
                valueParsed = valueParsed.answer;
            }
            return this.concept.getValueWrapperFor(valueParsed);
        }
        else return this.valueJSON;
    }

    get toResource() {
        return {conceptUUID: this.concept.uuid, value: this.getValueWrapper().toResource};
    }

    getValue() {
        return this.getValueWrapper().getValue();
    }

    setValue(valueWrapper) {
        this.valueJSON = valueWrapper;
    }

    getReadableValue() {
        let value = this.getValue();
        if (!_.isNil(value) && this.concept.datatype === Concept.dataType.Coded) {
            switch (typeof value) {
                case "string":
                    return this.concept.answers.find((conceptAnswer) => conceptAnswer.concept.uuid === value).name;
                case "object":
                    return value.map((answerUUID) =>
                        this.concept.answers.find((ca) => ca.concept.uuid === answerUUID).name);
            }
        }
        return value;
    }
}

export default Observation;