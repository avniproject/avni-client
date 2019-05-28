import Concept, {ConceptAnswer} from "./Concept";
import Gender from "./Gender";
import AddressLevel, {LocationMapping} from "./AddressLevel";
import Individual from "./Individual";
import AllSchema from "./Schema";
import _ from "lodash";
import LocaleMapping from "./LocaleMapping";
import Settings from "./Settings";
import Program from "./Program";
import ProgramEnrolment from "./ProgramEnrolment";
import ProgramEncounter from "./ProgramEncounter";
import EncounterType from "./EncounterType";
import Encounter from "./Encounter";
import ProgramOutcome from "./ProgramOutcome";
import Form from "./application/Form";
import FormElementGroup from "./application/FormElementGroup";
import FormElement from "./application/FormElement";
import FormMapping from "./application/FormMapping";
import Checklist from "./Checklist";
import ChecklistItem from "./ChecklistItem";
import UserInfo from "./UserInfo";
import ProgramConfig from "./ProgramConfig";
import IndividualRelation from "./relationship/IndividualRelation";
import IndividualRelationship from "./relationship/IndividualRelationship";
import IndividualRelationshipType from "./relationship/IndividualRelationshipType";
import IndividualRelationGenderMapping from "./relationship/IndividualRelationGenderMapping";
import Rule from "./Rule";
import RuleDependency from "./RuleDependency";
import ChecklistItemDetail from "./ChecklistItemDetail";
import ChecklistDetail from "./ChecklistDetail";
import Video from "./videos/Video";
import VideoTelemetric from "./videos/VideoTelemetric";
import SubjectType from "./SubjectType";
import SyncTelemetry from "./SyncTelemetry";
import IdentifierSource from "./IdentifierSource";
import IdentifierAssignment from "./IdentifierAssignment";

const refData = (clazz, {res, filter, translated, parent, syncWeight} = {}) => ({
    entityName: clazz.schema.name,
    entityClass: clazz,
    resourceName: res || _.camelCase(clazz.schema.name),
    type: 'reference',
    nameTranslated: translated || false,
    resourceSearchFilterURL: filter || 'lastModified',
    parent: parent,
    syncWeight: syncWeight,
});
const refDataNameTranslated = (clazz, attrs = {}) => refData(clazz, ({...attrs, translated: true}));

const txData = (clazz, {res, resUrl, parent, apiVersion, syncWeight} = {}) => ({
    entityName: clazz.schema.name,
    entityClass: clazz,
    resourceName: res || _.camelCase(clazz.schema.name),
    resourceUrl: resUrl,
    type: 'tx',
    nameTranslated: false,
    parent: parent,
    apiVersion,
    syncWeight: syncWeight,
});

const checklistDetail = refData(ChecklistDetail, {syncWeight: 6});
const rule = refData(Rule, {syncWeight: 3});
const ruleDependency = refData(RuleDependency, {syncWeight: 3});
const form = refData(Form, {syncWeight: 4});
const formMapping = refData(FormMapping, {syncWeight: 4});
const encounterType = refDataNameTranslated(EncounterType, {res: 'operationalEncounterType', syncWeight: 4});
const program = refDataNameTranslated(Program, {res: 'operationalProgram', syncWeight: 3});
const programOutcome = refDataNameTranslated(ProgramOutcome, {syncWeight: 3});
const gender = refDataNameTranslated(Gender, {syncWeight: 1});
const individualRelation = refDataNameTranslated(IndividualRelation, {syncWeight: 3});
const individualRelationGenderMapping = refDataNameTranslated(IndividualRelationGenderMapping, {syncWeight: 3});
const individualRelationshipType = refDataNameTranslated(IndividualRelationshipType, {syncWeight: 3});
const concept = refDataNameTranslated(Concept, {syncWeight: 4});
const programConfig = refDataNameTranslated(ProgramConfig, {syncWeight: 3});
const video = refDataNameTranslated(Video, {syncWeight: 0});
const subjectType = refDataNameTranslated(SubjectType, {res: 'operationalSubjectType', syncWeight: 1});
const checklistItemDetail = refData(ChecklistItemDetail, {parent: checklistDetail, syncWeight: 3});
const formElementGroup = refDataNameTranslated(FormElementGroup, {parent: form, syncWeight: 3});
const formElement = refDataNameTranslated(FormElement, {parent: formElementGroup, syncWeight: 5});
const conceptAnswer = refData(ConceptAnswer, {parent: concept, syncWeight: 4});
const identifierSource = refData(IdentifierSource, {syncWeight: 0});
const individual = txData(Individual, {syncWeight: 5});

const addressLevel = refDataNameTranslated(AddressLevel, {res: 'locations', syncWeight: 4});
const locationMapping = refData(LocationMapping, {parent: addressLevel, syncWeight: 4});

const encounter = txData(Encounter, {parent: individual, syncWeight: 7});
const programEnrolment = txData(ProgramEnrolment, {parent: individual, syncWeight: 3});
const programEncounter = txData(ProgramEncounter, {parent: programEnrolment, syncWeight: 5});
const checklist = txData(Checklist, {res: 'txNewChecklistEntity', parent: programEnrolment, syncWeight: 3});
const checklistItem = txData(ChecklistItem, {res: 'txNewChecklistItemEntity', parent: checklist, syncWeight: 2});
const individualRelationship = txData(IndividualRelationship, {parent: individual, syncWeight: 2});
const videoTelemetric = txData(VideoTelemetric, {res: 'videotelemetric', parent: video, syncWeight: 0});
const syncTelemetry = txData(SyncTelemetry, {resUrl: 'syncTelemetry', syncWeight: 1});
const userInfo = txData(UserInfo, {resUrl: 'me', apiVersion: 'v2', syncWeight: 1});
const identifierAssignment = txData(IdentifierAssignment, {syncWeight: 0});


class EntityMetaData {
    //order is important. last entity in each (tx and ref) with be executed first. parent should be synced before the child.
    static model() {
        return [
            video,
            checklistItemDetail,
            checklistDetail,
            rule,
            ruleDependency,
            individualRelationshipType,
            individualRelationGenderMapping,
            individualRelation,
            programConfig,
            formMapping,
            formElement,
            formElementGroup,
            form,
            identifierSource,

            locationMapping,
            addressLevel,
            encounterType,
            program,
            programOutcome,
            gender,
            subjectType,
            conceptAnswer,
            concept,

            videoTelemetric,
            individualRelationship,
            checklistItem,
            checklist,
            encounter,
            identifierAssignment,
            programEncounter,
            programEnrolment,
            individual,
            userInfo,
            syncTelemetry,
        ];
    }

    static entitiesLoadedFromServer() {
        return _.differenceBy(AllSchema.schema, [Settings, LocaleMapping], 'schema.name');
    }

    static findByName(entityName) {
        return _.find(EntityMetaData.model(), entityMetadata => entityMetadata.entityName === entityName);
    }
}

export default EntityMetaData;
