import {NativeModules} from 'react-native';
import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import FileSystemGateway from "./gateway/FileSystemGateway";
import General from "../utility/General";

@Service("exportService")
class ExportService extends BaseService {
    constructor(db, beanStore, fileSystemGateway) {
        super(db, beanStore);
        this.fileSystemGateway = fileSystemGateway === undefined ? FileSystemGateway : fileSystemGateway;
    }

    exportAll(done) {
        const questionnaireService = this.getService("questionnaireService");
        const questionnaireNames = questionnaireService.getQuestionnaireNames();

        questionnaireNames.forEach((questionnaireName) => {
            const fileContents = this.exportContents(questionnaireName);
            const fileName = General.replaceAndroidIncompatibleChars(questionnaireName) + General.getCurrentDate() + ".csv";
            this.fileSystemGateway.createFile(fileName, fileContents);
        });
        done();
    }

    getHeader(questionnaireName) {
        const questionnaireService = this.getService("questionnaireService");
        const questionnaire = questionnaireService.getQuestionnaire(questionnaireName);
        var header = '';
        questionnaire.questions.forEach(function (question) {
            header += General.toExportable(question.name);
            header += ',';
        });

        questionnaire.decisionKeys.forEach(function (decisionKey) {
            header += General.toExportable(decisionKey);
            header += ',';
        });
        header += "Created At";
        header += '\n';
        return header;
    }

    exportContents(questionnaireName) {
        const decisionSupportSessionService = this.getService("decisionSupportSessionService");
        var contents = this.getHeader(questionnaireName);

        const decisionSupportSessions = decisionSupportSessionService.getAll(questionnaireName);
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