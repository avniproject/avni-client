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

export class Questionnaire {
    static schema = {
        name: 'Questionnaire',
        properties: {
            name: 'string',
            description: 'string',
            questions: {"type": "list", "objectType": "QuestionnaireQuestion"},
            decisionKeys: {"type": "list", "objectType": 'string'},
            summaryFields: {"type": "list", "objectType": 'string'}

        }
    };
}