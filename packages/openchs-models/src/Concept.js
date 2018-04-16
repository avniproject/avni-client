import BaseEntity from './BaseEntity';
import ResourceUtil from "./utility/ResourceUtil";
import General from './utility/General';
import _ from 'lodash';
import MultipleCodedValues from "./observation/MultipleCodedValues";
import SingleCodedValue from "./observation/SingleCodedValue";
import PrimitiveValue from "./observation/PrimitiveValue";

export class ConceptAnswer {
    static schema = {
        name: 'ConceptAnswer',
        primaryKey: 'uuid',
        properties: {
            uuid: 'string',
            concept: 'Concept',
            answerOrder: 'int',
            abnormal: 'bool',
            voided: {"type": 'bool', optional: false}
        }
    };

    get name() {
        return this.concept.name;
    }

    static fromResource(resource, entityService) {
        const conceptAnswer = new ConceptAnswer();
        conceptAnswer.concept = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(resource, "conceptAnswerUUID"), Concept.schema.name);
        conceptAnswer.uuid = resource.uuid;
        conceptAnswer.answerOrder = resource.order;
        conceptAnswer.abnormal = resource.abnormal;
        conceptAnswer.voided = resource.voided || false;//This change should be independently deployable irrespective of server
        return conceptAnswer;
    }
}

export default class Concept {
    static schema = {
        name: 'Concept',
        primaryKey: 'uuid',
        properties: {
            uuid: 'string',
            name: 'string',
            datatype: "string",
            answers: {"type": "list", "objectType": "ConceptAnswer"},
            lowAbsolute: {"type": 'int', optional: true},
            hiAbsolute: {"type": 'int', optional: true},
            lowNormal: {"type": 'int', optional: true},
            hiNormal: {"type": 'int', optional: true},
            unit: {"type": 'string', optional: true},
            voided: {"type": 'bool', optional: false}
        }
    };

    static dataType = {
        Date: 'Date',
        Duration: 'Duration',
        Coded: 'Coded',
        Numeric: 'Numeric',
        Boolean: 'Boolean',
        Text: 'Text',
        NA: 'NA'
    };

    // static primitiveDataTypes = [Concept.dataType.Boolean, Concept.dataType.Coded, Concept.dataType.Numeric, Concept.dataType.Date, Concept.dataType.Text];

    static fromResource(conceptResource) {
        const concept = new Concept();
        concept.name = conceptResource.name;
        concept.uuid = conceptResource.uuid;
        concept.datatype = conceptResource.dataType;
        concept.lowAbsolute = conceptResource.lowAbsolute;
        concept.hiAbsolute = conceptResource.highAbsolute;
        concept.lowNormal = conceptResource.lowNormal;
        concept.hiNormal = conceptResource.highNormal;
        concept.unit = conceptResource.unit;
        concept.voided = conceptResource.voided || false; //This change should be independently deployable irrespective of server
        return concept;
    }

    static associateChild(child, childEntityClass, childResource, entityService) {
        let concept = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(childResource, "conceptUUID"), Concept.schema.name);
        concept = General.pick(concept, ["uuid"], ["answers"]);
        let newAnswers = concept.answers;
        if (childEntityClass !== ConceptAnswer) {
            throw `${childEntityClass.name} not support by ${Concept.name}`;
        }

        if (child.voided) {
            BaseEntity.removeFromCollection(newAnswers, child);
        } else {
            BaseEntity.addNewChild(child, newAnswers);
        }

        concept.answers = newAnswers;
        return concept;
    }

    static merge = () => BaseEntity.mergeOn('answers');

    static create(name, dataType) {
        const concept = new Concept();
        concept.name = name;
        concept.datatype = dataType;
        return concept;
    }

    cloneForReference() {
        const concept = Concept.create(this.name, this.datatype);
        concept.uuid = this.uuid;
        concept.unit = this.unit;
        concept.lowAbsolute = this.lowAbsolute;
        concept.lowNormal = this.lowNormal;
        concept.hiNormal = this.hiNormal;
        concept.hiAbsolute = this.hiAbsolute;
        concept.answers = this.getAnswers();
        return concept;
    }

    _valuePresent(value) {
        return !_.isNil(value) && !isNaN(value);
    }

    violatesRange(value) {
        return this.isAboveHiAbsolute(value) || this.isBelowLowAbsolute(value);
    }

    isAbnormal(value) {
        let valueWrapper = this.getValueWrapperFor(value);
        switch (this.datatype) {
            case Concept.dataType.Numeric:
                return this.isBelowLowNormal(valueWrapper.answer) || this.isAboveHiNormal(valueWrapper.answer);
            case Concept.dataType.Coded:
                return valueWrapper.hasAnyAbnormalAnswer(this.abnormalAnswers());
            default:
                return false;
        }
    }

    abnormalAnswers() {
        return _.filter(this.answers,
            (conceptAnswer) => conceptAnswer.abnormal).map((conceptAnswer) => {
            return conceptAnswer.concept.uuid
        });
    }

    isBelowLowNormal(value) {
        return this._areValidNumbers(value, this.lowNormal) && value < this.lowNormal;
    }

    isAboveHiNormal(value) {
        return this._areValidNumbers(value, this.hiNormal) && value > this.hiNormal;
    }

    isBelowLowAbsolute(value) {
        return this._areValidNumbers(value, this.lowAbsolute) && value < this.lowAbsolute;
    }

    isAboveHiAbsolute(value) {
        return this._areValidNumbers(value, this.hiAbsolute) && value > this.hiAbsolute;
    }

    addAnswer(concept) {
        const conceptAnswer = new ConceptAnswer();
        conceptAnswer.uuid = General.randomUUID();
        conceptAnswer.concept = concept;
        this.answers.push(conceptAnswer);
        return conceptAnswer;
    }

    getPossibleAnswerConcept(name) {
        return _.find(this.answers, (conceptAnswer) => conceptAnswer.concept.name === name);
    }

    getValueWrapperFor(value) {
        if (this.isCodedConcept()) {
            return _.isArray(value) ? new MultipleCodedValues(value) : new SingleCodedValue(value);
        } else {
            return new PrimitiveValue(value, this.datatype);
        }
    }

    isCodedConcept() {
        return this.datatype === Concept.dataType.Coded;
    }

    getAnswers() {
        return _.sortBy(this.answers, (answer) => answer.answerOrder);
    }

    get translatedFieldValue() {
        return this.name;
    }

    _areValidNumbers(...numbers) {
        return _.every(numbers, (value) => value !== null && _.isFinite(value));
    }

}