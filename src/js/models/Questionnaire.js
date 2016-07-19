import _ from 'lodash';

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
        primaryKey: 'uuid',
        properties: {
            uuid: 'string',
            name: 'string',
            description: 'string',
            questions: {"type": "list", "objectType": "QuestionnaireQuestion"},
            decisionKeys: {"type": "list", "objectType": "StringObject"},
            summaryFields: {"type": "list", "objectType": "StringObject"}

        }
    };

    static _obj(value) {
        return {"value": value};
    }

    static toDB(questionnaire) {
        questionnaire['decisionKeys'] = questionnaire['decisionKeys'].map(Questionnaire._obj);
        questionnaire['summaryFields'] = questionnaire['summaryFields'].map(Questionnaire._obj);
        return questionnaire;
    }

    static fromDB(questionnaire) {
        questionnaire = _.merge({}, questionnaire);
        questionnaire['decisionKeys'] = questionnaire['decisionKeys'].map((key)=> key.value);
        questionnaire['summaryFields'] = questionnaire['summaryFields'].map((field) => field.value);
        return questionnaire;
    }
}