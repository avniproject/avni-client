import Settings from "./Settings";
import {Locale, LocaleMapping} from "./Locale";
import Concept, {ConceptAnswer} from "./Concept";
import Decision from "./Decision";
import Individual from "./Individual";
import AddressLevel from "./AddressLevel";
import UserDefinedIndividualProperty from "./UserDefinedIndividualProperty";
import Gender from "./Gender";
import EntitySyncStatus from "./EntitySyncStatus";
import ProgramEnrolment from "./ProgramEnrolment";
import ProgramEncounter from "./ProgramEncounter";
import Program from "./Program";
import Observation from "./Observation";
import Encounter from "./Encounter";
import EncounterType from "./EncounterType";
import ProgramOutcome from "./ProgramOutcome";
import FormElement from "./application/FormElement";
import FormElementGroup from "./application/FormElementGroup";
import Form from "./application/Form";
import KeyValue from "./application/KeyValue";
import EntityQueue from "./EntityQueue";
import FormMapping from "./application/FormMapping";
import ConfigFile from "./ConfigFile";

export default {
    //order is important, should be arranged according to the dependency
    schema: [LocaleMapping, Locale, Settings, Decision, ConceptAnswer, Concept, EncounterType, Gender, UserDefinedIndividualProperty, AddressLevel, KeyValue, Form, FormMapping, FormElementGroup, FormElement, Individual, ProgramOutcome, Program, ProgramEnrolment, Observation, ProgramEncounter, Encounter, EntitySyncStatus, EntityQueue, ConfigFile],
    schemaVersion: 25,
    migration: function(oldDB, newDB) {
        if (oldDB.schemaVersion < 10) {
            var oldObjects = oldDB.objects('DecisionConfig');
            oldObjects.forEach((decisionConfig) => {
                newDB.create(ConfigFile.schema.name, ConfigFile.create(decisionConfig.fileName, decisionConfig.decisionCode), true);
            });
        } else if (oldDB.schemaVersion < 17) {
            var oldObjects = oldDB.objects('AddressLevel');
            var newObjects = newDB.objects('AddressLevel');

            for (var i = 0; i < oldObjects.length; i++) {
                newObjects[i].name = oldObjects[i].title;
            }
        } else if (oldDB.schemaVersion < 23) {
            var newObjects = newDB.objects('Individual');
            for (var i = 0; i < newObjects.length; i++) {
                newObjects[i].registrationDate = new Date(2017, 0, 0);
            }
        }
    }
};
