import Actions from '../../action';
import QuestionnaireService from "../../service/QuestionnaireService";

const getQuestionnaires = function (state, action, beans) {
    return beans.get(QuestionnaireService).getQuestionnaireNames();
};

export default new Map([[Actions.GET_QUESTIONNAIRES, getQuestionnaires]]);
