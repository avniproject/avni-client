import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import DecisionSupportSession from "../models/DecisionSupportSession";
import QuestionAnswer from "../models/QuestionAnswer";
import Answer from "../models/Answer";
import Decision from "../models/Decision";
import QuestionnaireService from "./QuestionnaireService";

@Service("decisionSupportSessionService")
class DecisionSupportSessionService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    save(questionnaireAnswers, decisions) {
        var decisionSupportSession = DecisionSupportSession.newInstance(questionnaireAnswers.questionnaireUUID, decisions, questionnaireAnswers.toSchemaInstance(), new Date());
        const db = this.db;
        db.write(() => db.create(DecisionSupportSession.schema.name, decisionSupportSession));
    }

    getAll(questionnaireUUID) {
        const allSessions = this.db.objects(DecisionSupportSession.schema.name);
        const expression = `questionnaireUUID = \"${questionnaireUUID}\"`;
        var questionnaireSessions = allSessions.filtered(expression).sorted("saveDate").slice(0, 100);
        var questionnaire = this.getService(QuestionnaireService).getQuestionnaire(questionnaireUUID);
        return questionnaireSessions.map((questionnaireSession) => {
            questionnaireSession.questionnaire = questionnaire.questionnaire;
            return questionnaireSession;
        });
    }

    getNumberOfSessions() {
        const allSessions = this.db.objects(DecisionSupportSession.schema.name);
        return allSessions.length;
    }

    deleteAll() {
        this.clearDataIn(DecisionSupportSession, QuestionAnswer, Decision, Answer);
    }
}

export default DecisionSupportSessionService;