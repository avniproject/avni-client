import BaseEntity from './BaseEntity';
import ResourceUtil from "./../utility/ResourceUtil";
import General from './../utility/General';

export class ConceptName {
    static schema = {
        name: 'ConceptName',
        properties: {
            name: 'string',
            locale: 'string'
        }
    }
}

export class ConceptAnswer {
    static schema = {
        name: 'ConceptAnswer',
        properties: {
            name: 'string',
            uuid: {"type": 'string', "optional": true}
        }
    }

    static fromResource(resource, entityService) {
        var conceptAnswer = new ConceptAnswer();
        var conceptAnswerConcept = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(resource, "conceptAnswerUUID"), Concept.schema.name);
        conceptAnswer.name = conceptAnswerConcept.name;
        conceptAnswer.uuid = resource.uuid;
        return conceptAnswer ;
    }

}

export class Concept {
    static schema = {
        name: 'Concept',
        primaryKey: 'uuid',
        properties: {
            uuid: 'string',
            name: 'string',
            conceptNames: {"type": "list", "objectType": "ConceptName"},
            datatype: "string",
            answers: {"type": "list", "objectType": "ConceptAnswer"},
            lowAbsolute: {"type": 'int', optional: true},
            hiAbsolute: {"type": 'int', optional: true},
            lowNormal: {"type": 'int', optional: true},
            hiNormal: {"type": 'int', optional: true}
        }
    };

    static fromResource(conceptResource) {
        var concept = new Concept();
        var conceptName = new ConceptName();
        conceptName.name = conceptResource.name;
        conceptName.locale = "en";
        concept.conceptNames = [conceptName];
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

}