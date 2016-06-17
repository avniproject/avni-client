import Service from "../framework/Service";
import BaseService from "./BaseService";
import DecisionSupportSession from "../models/DecisionSupportSession";

@Service("decisionSupportSessionService")
class DecisionSupportSessionService extends BaseService {
    constructor(db) {
        super(db);
    }

    save(questionnaireAnswers, conclusion) {
        var decisionSupportSession = DecisionSupportSession.newInstance(conclusion, questionnaireAnswers.toSchemaInstance());
        const db = this.db;
        db.write(() => db.create("DecisionSupportSession", decisionSupportSession));
    }
}

export default DecisionSupportSessionService;