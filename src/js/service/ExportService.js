import {NativeModules} from 'react-native';
import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import General from "../utility/General";
import {post} from '../framework/http/requests';

@Service("exportService")
class ExportService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    exportAll(done) {
        const exportURL = `${this.getService("settingsService").getServerURL()}/export`;
        this.getService("questionnaireService").getQuestionnaireNames().map(this.exportFileTo(exportURL));
        done();
    }

    exportFileTo(exportURL) {
        return (questionnaire) => {
            const fileContents = this.exportContents(questionnaire);
            const fileName = `${General.replaceAndroidIncompatibleChars(questionnaire.name)}_${General.getTimeStamp()}.csv`;
            post(`${exportURL}/${fileName}`, fileContents, ()=> {
            });
        }
    }

    getHeader(questionnaire) {
        const questionnaireService = this.getService("questionnaireService");
        const completeQuestionnaire = questionnaireService.getQuestionnaire(questionnaire.uuid);
        var header = '';
        completeQuestionnaire.questions.forEach(function (question) {
            header += General.toExportable(question.name);
            header += ',';
        });

        completeQuestionnaire.decisionKeys.forEach(function (decisionKey) {
            header += General.toExportable(decisionKey);
            header += ',';
        });
        header += "Created At";
        header += '\n';
        return header;
    }

    exportContents(questionnaire) {
        const decisionSupportSessionService = this.getService("decisionSupportSessionService");
        var contents = this.getHeader(questionnaire);

        const decisionSupportSessions = decisionSupportSessionService.getAll(questionnaire.name);
        decisionSupportSessions.forEach((session) => {
            session.questionAnswers.forEach(function (questionAnswer) {
                contents += General.toExportable(questionAnswer.answer);
                contents += ',';
            });
            for (var i = 0; i < session.decisions.length; i++) {
                contents += General.toExportable(session.decisions[i].value);
                contents += ',';
            }

            contents += General.formatDateTime(session.saveDate);
            contents += '\n';
        });
        return contents;
    }
}

export default ExportService;