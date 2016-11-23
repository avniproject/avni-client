import {Concept} from "./Concept";
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

class EntityMetaData {
    //order is important
    static model = [
        {entityName: "AddressLevel", entityClass: AddressLevel, resourceName: "addressLevel", type: "reference"},
        {entityName: "FollowupType", entityClass: FollowupType, resourceName: "followupType", type: "reference"},
        {entityName: "EncounterType", entityClass: EncounterType, resourceName: "encounterType", type: "reference"},
        {entityName: "Program", entityClass: Program, resourceName: "program", type: "reference"},
        {entityName: "Gender", entityClass: Gender, resourceName: "gender", type: "reference"},
        {entityName: "Concept", entityClass: Concept, resourceName: "concept", type: "reference"},

        {entityName: "Encounter", entityClass: Encounter, resourceName: "encounter", type: "tx"},
        {entityName: "ProgramEncounter", entityClass: ProgramEncounter, resourceName: "programEncounter", type: "tx"},
        {entityName: "ProgramEnrolment", entityClass: ProgramEnrolment, resourceName: "programEnrolment", type: "tx"},
        {entityName: "Individual", entityClass: Individual, resourceName: "individual", type: "tx"}
    ];

    static entitiesLoadedFromServer() {
        return _.differenceWith(AllSchema.schema, [Settings, LocaleMapping, Locale], (first, second) => {
            return first.schema.name === second.schema.name;
        });
    }
}

export default EntityMetaData;