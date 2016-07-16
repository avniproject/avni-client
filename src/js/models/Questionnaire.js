export class QuestionnaireQuestion {
    static schema = {
        name: 'QuestionnaireQuestion',
        properties: {
            name: 'string',
            multiSelect: {type: 'bool', optional: true},
            mandator: {type: 'bool', optional: true}
        }
    }
}

export class StringObject {
    static schema = {
        name: "StringObject",
        properties: {
            value: "string"
        }
    }
}

export class Questionnaire {
    static schema = {
        name: 'Questionnaire',
        primaryKey: 'name',
        properties: {
            name: 'string',
            description: 'string',
            questions: {"type": "list", "objectType": "QuestionnaireQuestion"},
            decisionKeys: {"type": "list", "objectType": "StringObject"},
            summaryFields: {"type": "list", "objectType": "StringObject"}

        }
    };
}