import Settings from './Settings';
import {Locale, LocaleMapping} from './Locale';
import QuestionnaireAnswers from './QuestionnaireAnswers';
import {Concept, ConceptAnswer, ConceptDatatype, ConceptName} from './Concept';
import {Questionnaire, QuestionnaireQuestion, StringObject} from './Questionnaire';
import DecisionSupportSession from "./DecisionSupportSession";
import QuestionAnswer from "./QuestionAnswer";
import Decision from "./Decision";

export default {
    schema: [LocaleMapping, Locale, Settings, QuestionAnswer, Decision, DecisionSupportSession, QuestionnaireQuestion, StringObject, Questionnaire, ConceptName, ConceptDatatype, ConceptAnswer, Concept]
};
