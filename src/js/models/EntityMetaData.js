import Concept, {ConceptAnswer} from "./Concept";
import Gender from "./Gender";
import AddressLevel from "./AddressLevel";
import Individual from "./Individual";
import AllSchema from "./index";
import _ from "lodash";
import {LocaleMapping, Locale} from "./Locale";
import Settings from "./Settings";
import FollowupType from "./FollowupType";
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

class EntityMetaData {
    static form = {entityName: "Form", entityClass: Form, resourceName: "form", type: "reference"};
    static formMapping = {entityName: "FormMapping", entityClass: FormMapping, resourceName: "formMapping", type: "reference"};
    static addressLevel = {entityName: "AddressLevel", entityClass: AddressLevel, resourceName: "addressLevel", type: "reference"};
    static followupType = {entityName: "FollowupType", entityClass: FollowupType, resourceName: "followupType", type: "reference"};
    static encounterType = {entityName: "EncounterType", entityClass: EncounterType, resourceName: "encounterType", type: "reference"};
    static program = {entityName: "Program", entityClass: Program, resourceName: "program", type: "reference"};
    static programOutcome = {entityName: "ProgramOutcome", entityClass: ProgramOutcome, resourceName: "programOutcome", type: "reference"};
    static gender = {entityName: "Gender", entityClass: Gender, resourceName: "gender", type: "reference"};
    static concept = {entityName: "Concept", entityClass: Concept, resourceName: "concept", type: "reference"};
    static individual = {entityName: "Individual", entityClass: Individual, resourceName: "individual", type: "tx"};

    static encounter() {
        return {entityName: "Encounter", entityClass: Encounter, resourceName: "encounter", type: "tx", parent: EntityMetaData.individual}
    };

    static programEnrolment() {
        return {entityName: "ProgramEnrolment", entityClass: ProgramEnrolment, resourceName: "programEnrolment", type: "tx", parent: EntityMetaData.individual};
    }

    static formElement() {
        return {entityName: "FormElement", entityClass: FormElement, resourceName: "formElement", type: "reference", parent: EntityMetaData.formElementGroup()};
    }

    static formElementGroup() {
        return {entityName: "FormElementGroup", entityClass: FormElementGroup, resourceName: "formElementGroup", type: "reference", parent: EntityMetaData.form};
    };

    static programEncounter() {
        return {entityName: "ProgramEncounter", entityClass: ProgramEncounter, resourceName: "programEncounter", type: "tx", parent: EntityMetaData.programEnrolment()};
    };

    static conceptAnswer() {
        return {entityName: "ConceptAnswer", entityClass: ConceptAnswer, resourceName: "conceptAnswer", type: "reference", parent: EntityMetaData.concept};
    };

    //order is important. last entity in each (tx and ref) with be executed first
    static model() {
        return [
            EntityMetaData.formMapping,
            EntityMetaData.formElement(),
            EntityMetaData.formElementGroup(),
            EntityMetaData.form,

            EntityMetaData.addressLevel,
            EntityMetaData.followupType,
            EntityMetaData.encounterType,
            EntityMetaData.program,
            EntityMetaData.programOutcome,
            EntityMetaData.gender,
            EntityMetaData.conceptAnswer(),
            EntityMetaData.concept,

            EntityMetaData.encounter(),
            EntityMetaData.programEncounter(),
            EntityMetaData.programEnrolment(),
            EntityMetaData.individual
        ];
    };

    static entitiesLoadedFromServer() {
        return _.differenceWith(AllSchema.schema, [Settings, LocaleMapping, Locale], (first, second) => {
            return first.schema.name === second.schema.name;
        });
    }
}

export default EntityMetaData;