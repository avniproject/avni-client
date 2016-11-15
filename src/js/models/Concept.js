export class ConceptName {
    static schema = {
        name: 'ConceptName',
        properties: {
            name: 'string',
            locale: 'string'
        }
    }
}

export class ConceptDatatype {
    static schema = {
        name: 'ConceptDatatype',
        properties: {
            name: 'string'
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
}

export class Concept {
    static schema = {
        name: 'Concept',
        primaryKey: 'uuid',
        properties: {
            uuid: 'string',
            name: 'string',
            conceptNames: {"type": "list", "objectType": "ConceptName"},
            datatype: {"type": "ConceptDatatype"},
            answers: {"type": "list", "objectType": "ConceptAnswer"},
            lowAbsolute: {"type": 'int', optional: true},
            hiAbsolute: {"type": 'int', optional: true},
            lowNormal: {"type": 'int', optional: true},
            hiNormal: {"type": 'int', optional: true}
        }
    };

    static fromResource(conceptResource) {
        var concept = new Concept();
        concept.name = conceptResource.name;
        concept.uuid = conceptResource.uuid;
        concept.datatype = conceptResource.dataType;
        concept.lowAbsolute = conceptResource.lowAbsolute;
        concept.hiAbsolute = conceptResource.highAbsolute;
        concept.lowAbsolute = conceptResource.lowNormal;
        concept.hiNormal = conceptResource.highNormal;
        return concept;
    }
}