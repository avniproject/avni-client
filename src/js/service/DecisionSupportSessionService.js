import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import DecisionSupportSession from "../models/DecisionSupportSession";
import QuestionAnswer from "../models/QuestionAnswer";
import Decision from "../models/Decision";

@Service("decisionSupportSessionService")
class DecisionSupportSessionService extends BaseService {
    constructor(db) {
        super(db);
    }

    save(questionnaireAnswers, decisions) {
        var decisionSupportSession = DecisionSupportSession.newInstance(questionnaireAnswers.questionnaireName, decisions, questionnaireAnswers.toSchemaInstance(), new Date());
        const db = this.db;
        db.write(() => db.create(DecisionSupportSession.EntityName, decisionSupportSession));
    }

    getAll(questionnaireName) {
        const allSessions = this.db.objects(DecisionSupportSession.EntityName);
        if (questionnaireName === undefined) return allSessions;
        const expression = `questionnaireName = \"${questionnaireName}\"`;
        return allSessions.filtered(expression);
    }
    
    getNumberOfSessions() {
        const allSessions = this.db.objects(DecisionSupportSession.EntityName);
        return allSessions.length;
    }

    deleteAll() {
        const db = this.db;
        
        const entities = [DecisionSupportSession.EntityName, QuestionAnswer.EntityName, Decision.EntityName];
        entities.forEach((entityName) => {
            db.write(() => {
                var objects = db.objects(entityName);
                db.delete(objects);
            });
        });
    }
}

export default DecisionSupportSessionService;