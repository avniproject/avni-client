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

const refData = (clazz, {res, filter, translated, parent} = {}) => ({
    entityName: clazz.schema.name,
    entityClass: clazz,
    resourceName: res || _.camelCase(clazz.schema.name),
    type: 'reference',
    nameTranslated: translated || false,
    resourceSearchFilterURL: filter || 'lastModified',
    parent: parent,
});
const refDataNameTranslated = (clazz, attrs = {}) => refData(clazz, ({...attrs, translated: true}));

const txData = (clazz, {res, resUrl, parent, apiVersion} = {}) => ({
    entityName: clazz.schema.name,
    entityClass: clazz,
    resourceName: res || _.camelCase(clazz.schema.name),
    resourceUrl: resUrl,
    type: 'tx',
    nameTranslated: false,
    parent: parent,
    apiVersion,
});

const checklistDetail = refData(ChecklistDetail);
const rule = refData(Rule);
const ruleDependency = refData(RuleDependency);
const form = refData(Form);
const formMapping = refData(FormMapping);
const addressLevel = refDataNameTranslated(AddressLevel, {res: 'locations', filter: 'byCatchmentAndLastModified'});
const encounterType = refDataNameTranslated(EncounterType, {res: 'operationalEncounterType'});
const program = refDataNameTranslated(Program, {res: 'operationalProgram'});
const programOutcome = refDataNameTranslated(ProgramOutcome);
const gender = refDataNameTranslated(Gender);
const individualRelation = refDataNameTranslated(IndividualRelation);
const individualRelationGenderMapping = refDataNameTranslated(IndividualRelationGenderMapping);
const individualRelationshipType = refDataNameTranslated(IndividualRelationshipType);
const concept = refDataNameTranslated(Concept);
const programConfig = refDataNameTranslated(ProgramConfig);
const video = refDataNameTranslated(Video);
const subjectType = refDataNameTranslated(SubjectType, {res: 'operationalSubjectType'});
const checklistItemDetail = refData(ChecklistItemDetail, {parent: checklistDetail});
const formElementGroup = refDataNameTranslated(FormElementGroup, {parent: form});
const formElement = refDataNameTranslated(FormElement, {parent: formElementGroup});
const conceptAnswer = refData(ConceptAnswer, {parent: concept});
const locationMapping = refData(LocationMapping, {filter: 'byCatchmentAndLastModified', parent: addressLevel});
const identifierSource = refData(IdentifierSource);

const individual = txData(Individual);
const encounter = txData(Encounter, {parent: individual});
const programEnrolment = txData(ProgramEnrolment, {parent: individual});
const programEncounter = txData(ProgramEncounter, {parent: programEnrolment});
const checklist = txData(Checklist, {res: 'txNewChecklistEntity', parent: programEnrolment});
const checklistItem = txData(ChecklistItem, {res: 'txNewChecklistItemEntity', parent: checklist});
const individualRelationship = txData(IndividualRelationship, {parent: individual});
const videoTelemetric = txData(VideoTelemetric, {res: 'videotelemetric', parent: video});
const syncTelemetry = txData(SyncTelemetry, {resUrl: 'syncTelemetry'});
const userInfo = txData(UserInfo, {resUrl: 'me', apiVersion: 'v2'});
const identifierAssignment = txData(IdentifierAssignment);


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
        return _.differenceWith(AllSchema.schema, [Settings, LocaleMapping, UserInfo], (first, second) => {
            if (_.isNil(second)) return false;

            return first.schema.name === second.schema.name;
        });
    }

    static findByName(entityName) {
        return _.find(EntityMetaData.model(), entityMetadata => entityMetadata.entityName === entityName);
    }
}

export default EntityMetaData;
