import Settings from "./Settings";
import {Locale, LocaleMapping} from "./Locale";
import {Concept, ConceptAnswer, ConceptDatatype, ConceptName} from "./Concept";
import {Questionnaire, QuestionnaireQuestion, StringObject} from "./Questionnaire";
import DecisionSupportSession from "./DecisionSupportSession";
import QuestionAnswer from "./QuestionAnswer";
import Answer from "./Answer";
import Decision from "./Decision";
import DecisionData from "./DecisionConfig";
import Individual from "./Individual";
import AddressLevel from "./AddressLevel";
import UserDefinedIndividualProperty from "./UserDefinedIndividualProperty";
import Gender from "./Gender";
import EntitySyncStatus from "./EntitySyncStatus";

export default {
    schema: [LocaleMapping, Locale, Settings, QuestionAnswer, Decision, DecisionSupportSession, QuestionnaireQuestion, StringObject, Questionnaire, ConceptName, ConceptDatatype, ConceptAnswer, Concept, Gender, DecisionData, Answer, UserDefinedIndividualProperty, AddressLevel, Individual, EntitySyncStatus]
};
