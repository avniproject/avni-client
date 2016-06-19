import React, {NativeModules} from 'react-native';
import BaseService from "./BaseService";
import Service from "../framework/Service";
import FileSystemGateway from "./gateway/FileSystemGateway";
import General from "../utility/General"

@Service("exportService")
class ExportService extends BaseService {
    constructor(db, beanStore, fileSystemGateway) {
        super(db, beanStore);
        this.fileSystemGateway = fileSystemGateway === undefined ? new FileSystemGateway() : fileSystemGateway;
    }

    exportAll() {
        const questionnaireService = this.getService("questionnaireService");
        const questionnaireNames = questionnaireService.getQuestionnaireNames();

        questionnaireNames.forEach((questionnaireName) => {
            const fileContents = this.exportContents(questionnaireName);
            const fileName = General.replaceAndroidIncompatibleChars(questionnaireName) + General.getCurrentDate() + ".csv";
            this.fileSystemGateway.createFile(fileName, fileContents);
        });
    }

    getHeader(questionnaireName) {
        const questionnaireService = this.getService("questionnaireService");
        const questionnaire = questionnaireService.getQuestionnaire(questionnaireName);
        var header = '';
        questionnaire.questions.forEach(function (question) {
            header += General.toExportable(question);
            header += ',';
        });

        header += General.toExportable(questionnaire.decisionKeys[0]);
        header += ",Created At";
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
            contents += General.toExportable(session.decisions[0].value);
            contents += ',';
            contents += General.formatDateTime(session.saveDate);
            contents += '\n';
        });
        return contents;
    }
}

export default ExportService;