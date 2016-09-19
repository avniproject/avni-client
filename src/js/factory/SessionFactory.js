import QuestionnaireService from "../service/QuestionnaireService";
import Session from '../models/Session';

class SessionFactory {
    register(beans) {
        this.beans = beans;
    }

    getSession(questionnaireUUID) {
        const questionnaire = this.beans.get(QuestionnaireService).getQuestionnaire(questionnaireUUID);
        return new Session(questionnaire);
    }
}

export default new SessionFactory();