import Service from "../framework/Service";
import BaseService from "./BaseService";
import DecisionSupportSession from "../models/DecisionSupportSession";

@Service("decisionSupportSessionService")
class DecisionSupportSessionService extends BaseService {
    constructor(db) {
        super(db);
        this.entityName = "DecisionSupportSession";
    }

    save(questionnaireAnswers, decisions) {
        var decisionSupportSession = DecisionSupportSession.newInstance(questionnaireAnswers.questionnaireName, decisions, questionnaireAnswers.toSchemaInstance());
        const db = this.db;
        db.write(() => db.create(this.entityName, decisionSupportSession));
    }

    getAll(questionnaireName) {
        return this.getAll().filter(`questionnaireName = ${questionnaireName}`);
    }

    getAll() {
        const db = this.db;
        return db.objects(this.entityName);
    }

    deleteAll() {
        const db = this.db;
        let allSessions = db.objects(this.entityName);
        db.write(() => db.deleteAll(allSessions));
    }
}

export default DecisionSupportSessionService;