import Settings from './Settings';
import {Locale, LocaleMapping} from './Locale';
import QuestionnaireAnswers from './QuestionnaireAnswers';
import {Questionnaire, QuestionnaireQuestion} from './Questionnaire';
import DecisionSupportSession from "./DecisionSupportSession";
import QuestionAnswer from "./QuestionAnswer";
import Decision from "./Decision";

export default {
    schema: [LocaleMapping, Locale, Settings, QuestionAnswer, Decision, DecisionSupportSession, QuestionnaireQuestion, Questionnaire]
};
