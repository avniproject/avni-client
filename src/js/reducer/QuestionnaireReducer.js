import questionnaireActions from '../action/questionnaire';

const QuestionnaireReducer = {
    factory: (beans) => (state = [], action) => {
        if (!(questionnaireActions.has(action.type))) return state;
        return questionnaireActions.get(action.type)(state, action, beans);
    }
};

export default QuestionnaireReducer;