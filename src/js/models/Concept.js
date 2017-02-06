import BaseEntity from './BaseEntity';
import ResourceUtil from "./../utility/ResourceUtil";
import General from './../utility/General';

export class ConceptAnswer {
    static schema = {
        name: 'ConceptAnswer',
        primaryKey: 'uuid',
        properties: {
            uuid: 'string',
            concept: 'Concept'
        }
    };

    static fromResource(resource, entityService) {
        const conceptAnswer = new ConceptAnswer();
        conceptAnswer.concept = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(resource, "conceptAnswerUUID"), Concept.schema.name);
        conceptAnswer.uuid = resource.uuid;
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
            hiNormal: {"type": 'int', optional: true}
        }
    };

    static dataType = {
        Date: 'Date',
        Duration: 'Duration',
        Coded: 'Coded',
        Numeric: 'Numeric',
        Boolean: 'Boolean'
    };

    static fromResource(conceptResource) {
        const concept = new Concept();
        concept.name = conceptResource.name;
        concept.uuid = conceptResource.uuid;
        concept.datatype = conceptResource.dataType;
        concept.lowAbsolute = conceptResource.lowAbsolute;
        concept.hiAbsolute = conceptResource.highAbsolute;
        concept.lowAbsolute = conceptResource.lowNormal;
        concept.hiNormal = conceptResource.highNormal;
        return concept;
    }

    static associateChild(child, childEntityClass, childResource, entityService) {
        var concept = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(childResource, "conceptUUID"), Concept.schema.name);
        concept = General.pick(concept, ["uuid"], ["answers"]);

        if (childEntityClass === ConceptAnswer)
            BaseEntity.addNewChild(child, concept.answers);
        else
            throw `${childEntityClass.name} not support by ${Concept.name}`;
        return concept;
    }

    static create(name, dataType) {
        const concept = new Concept();
        concept.name = name;
        concept.datatype = dataType;
        return concept;
    }
}