import Service from "../framework/Service";
import BaseService from "./BaseService";
import DecisionSupportSession from "../models/DecisionSupportSession";

@Service("decisionSupportSessionService")
class DecisionSupportSessionService extends BaseService {
    constructor(db) {
        super(db);
    }

    save(questionnaireAnswers, conclusion) {
        const decisionSupportSession = new DecisionSupportSession(conclusion, questionnaireAnswers.toSchemaInstance());
        const db = this.db;
        console.log(decisionSupportSession);
        console.log(conclusion);
        db.write(() => db.create(decisionSupportSession.constructor.name, decisionSupportSession));
    }
}

export default DecisionSupportSessionService;