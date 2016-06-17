import Settings from './Settings';
import {Locale, LocaleMapping} from './Locale';
import QuestionnaireAnswers from './QuestionnaireAnswers';
import DecisionSupportSession from "./DecisionSupportSession";
import QuestionAnswer from "./QuestionAnswer";
import Decision from "./Decision";

export default {
    schema: [LocaleMapping, Locale, Settings, QuestionAnswer, QuestionnaireAnswers, Decision, DecisionSupportSession]
};
