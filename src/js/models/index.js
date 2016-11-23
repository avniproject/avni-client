import Settings from "./Settings";
import {Locale, LocaleMapping} from "./Locale";
import {Concept, ConceptAnswer, ConceptName} from "./Concept";
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
import FollowupType from "./FollowupType";
import ProgramEnrolment from "./ProgramEnrolment";
import ProgramEncounter from "./ProgramEncounter";
import Program from "./Program";
import Observation from "./Observation";
import Encounter from "./Encounter";
import EncounterType from "./EncounterType";

export default {
    //order is important, should be arranged according to the dependency
    schema: [LocaleMapping, Locale, Settings, StringObject, QuestionAnswer, Decision, DecisionSupportSession, QuestionnaireQuestion, Questionnaire, ConceptName, ConceptAnswer, Concept, FollowupType, EncounterType, Gender, DecisionData, Answer, UserDefinedIndividualProperty, AddressLevel, Individual, Program, ProgramEnrolment, Observation, ProgramEncounter, Encounter, EntitySyncStatus]
};
