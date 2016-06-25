import QuestionnaireAnswers from "../models/QuestionnaireAnswers";
let instance = null;
import FileSystemGateway from '../service/gateway/FileSystemGateway';
import RuntimeMode from '../utility/RuntimeMode';

class AppState {
    constructor() {
        if (!instance) {
            instance = this;

            this.diabetes = require('../../config/diabetes.json');
            this.sample = require('../../config/sample-questionnaire.json');

            this.questionnaireData = new Map();
            this.questionnaireData.set(this.sample.name, this.sample);
            this.questionnaireData.set(this.diabetes.name, this.diabetes);
            if (!RuntimeMode.runningTest()) {
                FileSystemGateway.readFile('vhw-lokbiradari.json', AppState.onRead, this.questionnaireData);
                FileSystemGateway.readFile('bmi.json', AppState.onRead, this.questionnaireData);
            }
        }
        return instance;
    }

    static onRead(contents, questionnaireData) {
        var obj = JSON.parse(contents);
        questionnaireData.set(obj.name, obj);
    }

    startQuestionnaireSession(questionnaire) {
        this.questionnaireAnswers = new QuestionnaireAnswers(questionnaire);
    }
}
export default new AppState();