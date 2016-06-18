import React, {NativeModules} from 'react-native';
import BaseService from "./BaseService";
import Service from "../framework/Service";
import FileSystemGateway from "./gateway/FileSystemGateway";

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
            this.exportContents(questionnaireName);
        });
    }

    getHeader(questionnaireName) {
        const questionnaireService = this.getService("questionnaireService");
        const questionnaire = questionnaireService.getQuestionnaire(questionnaireName);
        var header = '';
        questionnaire.questions.forEach(function (question) {
            header += ExportService.makeItExportable(question);
            header += ',';
        });

        header += ExportService.makeItExportable(questionnaire.decisions[0]);
        header += '\n';
        return header;
    }

    static makeItExportable(str) {
        var result = str.replace(/"/g, '""');
        if (result.search(/("|,|\n)/g) >= 0)
            result = '"' + result + '"';
        return result;
    }

    exportContents(questionnaireName) {
        const decisionSupportSessionService = this.getService("decisionSupportSessionService");
        const allSessions = decisionSupportSessionService.getAll();

        var contents = this.getHeader(questionnaireName);
        const decisionSupportSessions = allSessions.filter(`questionnaireName = ${questionnaireName}`);
        decisionSupportSessions.forEach(function (session) {
            session.questionnaireAnswers.forEach(function (questionnaireAnswer) {
                contents += ExportService.makeItExportable(questionnaireAnswer.answer);
                contents += ',';
            });
            contents += ExportService.makeItExportable(session.decisions[0].value);
            contents += '\n';
        });
        return contents;
    }
}

export default ExportService;