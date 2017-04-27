import Concept, {ConceptAnswer} from "./Concept";
import Gender from "./Gender";
import AddressLevel from "./AddressLevel";
import Individual from "./Individual";
import AllSchema from "./index";
import _ from "lodash";
import {LocaleMapping} from "./Locale";
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

class EntityMetaData {
    static form = {entityName: "Form", entityClass: Form, resourceName: "form", type: "reference", nameTranslated: false};
    static formMapping = {entityName: "FormMapping", entityClass: FormMapping, resourceName: "formMapping", type: "reference", nameTranslated: false};
    static addressLevel = {entityName: "AddressLevel", entityClass: AddressLevel, resourceName: "addressLevel", type: "reference", nameTranslated: true};
    static encounterType = {entityName: "EncounterType", entityClass: EncounterType, resourceName: "encounterType", type: "reference", nameTranslated: true};
    static program = {entityName: "Program", entityClass: Program, resourceName: "program", type: "reference", nameTranslated: true};
    static programOutcome = {entityName: "ProgramOutcome", entityClass: ProgramOutcome, resourceName: "programOutcome", type: "reference", nameTranslated: true};
    static gender = {entityName: "Gender", entityClass: Gender, resourceName: "gender", type: "reference", nameTranslated: true};
    static concept = {entityName: "Concept", entityClass: Concept, resourceName: "concept", type: "reference", nameTranslated: true};
    static individual = {entityName: "Individual", entityClass: Individual, resourceName: "individual", resourceSearchFilterURL: "byCatchmentAndLastModified", type: "tx"};

    static encounter() {
        return {entityName: "Encounter", entityClass: Encounter, resourceName: "encounter", resourceSearchFilterURL: "byIndividualsOfCatchmentAndLastModified", type: "tx", parent: EntityMetaData.individual, nameTranslated: false}
    };

    static programEnrolment() {
        return {entityName: "ProgramEnrolment", entityClass: ProgramEnrolment, resourceName: "programEnrolment", resourceSearchFilterURL: "byIndividualsOfCatchmentAndLastModified", type: "tx", parent: EntityMetaData.individual, nameTranslated: false};
    }

    static formElement() {
        return {entityName: "FormElement", entityClass: FormElement, resourceName: "formElement", type: "reference", parent: EntityMetaData.formElementGroup(), nameTranslated: true};
    }

    static formElementGroup() {
        return {entityName: "FormElementGroup", entityClass: FormElementGroup, resourceName: "formElementGroup", type: "reference", parent: EntityMetaData.form, nameTranslated: true};
    };

    static programEncounter() {
        return {entityName: "ProgramEncounter", entityClass: ProgramEncounter, resourceName: "programEncounter", resourceSearchFilterURL: "byIndividualsOfCatchmentAndLastModified", type: "tx", parent: EntityMetaData.programEnrolment(), nameTranslated: false};
    };

    static conceptAnswer() {
        return {entityName: "ConceptAnswer", entityClass: ConceptAnswer, resourceName: "conceptAnswer", type: "reference", parent: EntityMetaData.concept, nameTranslated: false};
    };

    static checklist() {
        return {entityName: "Checklist", entityClass: Checklist, resourceName: "checklist", resourceSearchFilterURL: "byIndividualsOfCatchmentAndLastModified", type: "tx", parent: EntityMetaData.programEnrolment(), nameTranslated: false};
    }

    static checklistItem() {
        return {entityName: "ChecklistItem", entityClass: ChecklistItem, resourceName: "checklistItem", resourceSearchFilterURL: "byIndividualsOfCatchmentAndLastModified", type: "tx", parent: EntityMetaData.checklist(), nameTranslated: false};
    }

    //order is important. last entity in each (tx and ref) with be executed first
    static model() {
        return [
            EntityMetaData.formMapping,
            EntityMetaData.formElement(),
            EntityMetaData.formElementGroup(),
            EntityMetaData.form,

            EntityMetaData.addressLevel,
            EntityMetaData.encounterType,
            EntityMetaData.program,
            EntityMetaData.programOutcome,
            EntityMetaData.gender,
            EntityMetaData.conceptAnswer(),
            EntityMetaData.concept,

            EntityMetaData.checklistItem(),
            EntityMetaData.checklist(),
            EntityMetaData.encounter(),
            EntityMetaData.programEncounter(),
            EntityMetaData.programEnrolment(),
            EntityMetaData.individual
        ];
    };

    static entitiesLoadedFromServer() {
        return _.differenceWith(AllSchema.schema, [Settings, LocaleMapping], (first, second) => {
            if (_.isNil(second)) return false;

            return first.schema.name === second.schema.name;
        });
    }
}

export default EntityMetaData;