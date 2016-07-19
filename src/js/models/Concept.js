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
            answers: {"type": "list", "objectType": "ConceptAnswer"}
        }
    };

}