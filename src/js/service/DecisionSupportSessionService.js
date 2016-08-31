import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import DecisionSupportSession from "../models/DecisionSupportSession";
import QuestionAnswer from "../models/QuestionAnswer";
import Answer from "../models/Answer";
import Decision from "../models/Decision";

@Service("decisionSupportSessionService")
class DecisionSupportSessionService extends BaseService {
    constructor(db) {
        super(db);
    }

    save(questionnaireAnswers, decisions) {
        var decisionSupportSession = DecisionSupportSession.newInstance(questionnaireAnswers.questionnaireUUID, decisions, questionnaireAnswers.toSchemaInstance(), new Date());
        const db = this.db;
        db.write(() => db.create(DecisionSupportSession.schema.name, decisionSupportSession));
    }

    getAll(questionnaireUUID) {
        const allSessions = this.db.objects(DecisionSupportSession.schema.name);
        const expression = `questionnaireUUID = \"${questionnaireUUID}\"`;
        return allSessions.filtered(expression);
    }

    getNumberOfSessions() {
        const allSessions = this.db.objects(DecisionSupportSession.schema.name);
        return allSessions.length;
    }

    deleteAll() {
        const db = this.db;

        [DecisionSupportSession.schema.name, QuestionAnswer.schema.name, Decision.schema.name, Answer.schema.name].forEach((entityName) => {
            db.write(() => {
                var objects = db.objects(entityName);
                db.delete(objects);
            });
        });
    }
}

export default DecisionSupportSessionService;