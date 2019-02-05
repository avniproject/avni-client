import Settings from "./Settings";
import LocaleMapping from "./LocaleMapping";
import Concept, {ConceptAnswer} from "./Concept";
import Individual from "./Individual";
import Family from "./Family";
import AddressLevel, {LocationMapping} from "./AddressLevel";
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
import Format from "./application/Format";
import EntityQueue from "./EntityQueue";
import FormMapping from "./application/FormMapping";
import ConfigFile from "./ConfigFile";
import ChecklistItemStatus from "./ChecklistItemStatus";
import ChecklistItemDetail from "./ChecklistItemDetail";
import ChecklistDetail from "./ChecklistDetail";
import Checklist from "./Checklist";
import ChecklistItem from "./ChecklistItem";
import _ from 'lodash';
import UserInfo from "./UserInfo";
import ProgramConfig from "./ProgramConfig";
import StringKeyNumericValue from "./application/StringKeyNumericValue";
import VisitScheduleInterval from "./VisitScheduleInterval";
import VisitScheduleConfig from "./VisitScheduleConfig";
import IndividualRelation from "./relationship/IndividualRelation";
import IndividualRelationship from "./relationship/IndividualRelationship";
import IndividualRelationshipType from "./relationship/IndividualRelationshipType";
import IndividualRelationGenderMapping from "./relationship/IndividualRelationGenderMapping";
import Rule from "./Rule";
import RuleDependency from "./RuleDependency";
import Video from "./videos/Video";
import VideoTelemetric from "./videos/VideoTelemetric";
import MediaQueue from "./MediaQueue";
import Point from "./geo/Point";

export default {
    //order is important, should be arranged according to the dependency
    schema: [LocaleMapping, Settings, ConceptAnswer, Concept, EncounterType, Gender, UserDefinedIndividualProperty,
        LocationMapping, AddressLevel, KeyValue, Form, FormMapping, FormElementGroup, FormElement, Individual,
        ProgramOutcome, Program, ProgramEnrolment, Observation, ProgramEncounter, Encounter, EntitySyncStatus,
        EntityQueue, ConfigFile, Checklist, ChecklistItem, Format, UserInfo, StringKeyNumericValue, VisitScheduleInterval,
        VisitScheduleConfig, ProgramConfig, Family, IndividualRelation, IndividualRelationGenderMapping,
        IndividualRelationshipType, IndividualRelationship, RuleDependency, Rule, ChecklistItemStatus,
        ChecklistDetail, ChecklistItemDetail, VideoTelemetric, Video, MediaQueue, Point],
    schemaVersion: 92,
    migration: function (oldDB, newDB) {
        if (oldDB.schemaVersion < 10) {
            var oldObjects = oldDB.objects('DecisionConfig');
            oldObjects.forEach((decisionConfig) => {
                newDB.create(ConfigFile.schema.name, ConfigFile.create(decisionConfig.fileName, decisionConfig.decisionCode), true);
            });
        }
        if (oldDB.schemaVersion < 17) {
            var oldObjects = oldDB.objects('AddressLevel');
            var newObjects = newDB.objects('AddressLevel');

            for (var i = 0; i < oldObjects.length; i++) {
                newObjects[i].name = oldObjects[i].title;
            }
        }
        if (oldDB.schemaVersion < 23) {
            var newObjects = newDB.objects('Individual');
            for (var i = 0; i < newObjects.length; i++) {
                newObjects[i].registrationDate = new Date(2017, 0, 0);
            }
        }
        if (oldDB.schemaVersion < 30) {
            var oldObjects = oldDB.objects('Settings');
            var newObjects = newDB.objects('Settings');
            for (var i = 0; i < newObjects.length; i++) {
                newObjects[i].locale = null;
            }
            const oldLocaleMappings = newDB.objects('LocaleMapping');
            newDB.delete(oldLocaleMappings);
        }
        if (oldDB.schemaVersion < 32) {
            const oldSettings = newDB.objects('Settings');
            newDB.delete(oldSettings);
        }
        if (oldDB.schemaVersion < 33) {
            const checklists = newDB.objects('Checklist');
            _.forEach(checklists, (checklist) => {
                checklist.baseDate = checklist.programEnrolment.individual.dateOfBirth;
            });
        }
        if (oldDB.schemaVersion < 38) {
            const programs = newDB.objects('Program');
            _.forEach(programs, (program) => {
                program.colour = Program.randomColour();
            })
        }
        if (oldDB.schemaVersion < 39) {
            const settings = newDB.objects('Settings');
            _.forEach(settings, (setting) => {
                setting.userId = "";
                setting.password = "";
            })
        }
        if (oldDB.schemaVersion < 40) {
            const settings = newDB.objects('Settings');
            _.forEach(settings, (setting) => {
                setting.authToken = "";
            })
        }
        if (oldDB.schemaVersion < 41) {
            const settings = newDB.objects('Settings');
            _.forEach(settings, (setting) => {
                setting.poolId = "";
                setting.clientId = "";
                setting.organisationName = "";
            })
        }
        if (oldDB.schemaVersion < 42) {
            const individuals = newDB.objects('Individual');
            _.forEach(individuals, (individual) => {
                individual.firstName = "";
                individual.lastName = "";
            })
        }
        if (oldDB.schemaVersion < 48) {
            const concepts = newDB.objects('Concept');
            _.forEach(concepts, (concept) => {
                concept.voided = false;
            });
            const conceptAnswers = newDB.objects('ConceptAnswer');
            _.forEach(conceptAnswers, (conceptAnswer) => {
                conceptAnswer.voided = false;
            });
        }
        if (oldDB.schemaVersion < 49) {
            const oldFormElements = oldDB.objects('FormElement');
            const formElements = newDB.objects('FormElement');
            for (let i = 0; i < oldFormElements.length; i++) {
                formElements[i].displayOrder = oldFormElements[i].displayOrder;
            }
            const oldFormElementGroups = oldDB.objects('FormElementGroup');
            const formElementGroups = newDB.objects('FormElementGroup');
            for (let j = 0; j < oldFormElementGroups.length; j++) {
                formElementGroups[j].displayOrder = oldFormElementGroups[j].displayOrder;
            }
        }
        if (oldDB.schemaVersion < 50) {
            const concepts = newDB.objects('Concept');
            _.forEach(concepts, (concept) => {
                if (concept.datatype === "N/A") {
                    concept.datatype = "NA";
                }
            });
        }
        if (oldDB.schemaVersion < 51) {
            const conceptAnswers = newDB.objects('ConceptAnswer');
            _.forEach(conceptAnswers, (conceptAnswer) => {
                conceptAnswer.unique = false;
            });
        }
        if (oldDB.schemaVersion < 54) {
            _.forEach(newDB.objects('FormMapping'), (fm) => fm.voided = false);
        }
        if (oldDB.schemaVersion < 55) {
            _.forEach(newDB.objects('EncounterType'), (fm) => fm.voided = false);
        }
        if (oldDB.schemaVersion < 64) {
            _.forEach(newDB.objects('EncounterType'), (et) => {
                if (_.isEmpty(et.operationalEncounterTypeName)) {
                    et.operationalEncounterTypeName = et.name;
                }
                if (_.isEmpty(et.displayName)) {
                    et.displayName = _.isEmpty(et.operationalEncounterTypeName) ? et.name : et.operationalEncounterTypeName;
                }
            });
            _.forEach(newDB.objects('Program'), (p) => {
                if (_.isEmpty(p.operationalProgramName)) {
                    p.operationalProgramName = p.name
                }
                if (_.isEmpty(p.displayName)) {
                    p.displayName = _.isEmpty(p.operationalProgramName) ? p.name : p.operationalProgramName;
                }
            });
        }
        if (oldDB.schemaVersion < 67) {
            const oldConceptAnswers = oldDB.objects('ConceptAnswer');
            const conceptAnswers = newDB.objects('ConceptAnswer');
            for (let i = 0; i < oldConceptAnswers.length; i++) {
                conceptAnswers[i].answerOrder = oldConceptAnswers[i].answerOrder;
            }
        }

        if (oldDB.schemaVersion < 73) {
            const oldChecklists = newDB.objects('Checklist');
            const oldChecklistItems = newDB.objects('ChecklistItem');
            newDB.delete(oldChecklistItems);
            newDB.delete(oldChecklists)
        }

        if (oldDB.schemaVersion < 74) {
            _.forEach(newDB.objects('Individual'),
                (individual) => individual.voided = false);
        }

        if (oldDB.schemaVersion < 76) {
            const oldAddressLevels = oldDB.objects('AddressLevel');
            const addressLevels = newDB.objects('AddressLevel');
            for (let i = 0; i < oldAddressLevels.length; i++) {
                addressLevels[i].level = oldAddressLevels[i].level;
            }
        }
        if (oldDB.schemaVersion < 82) {
            const oblongProgramEncounters = newDB.objects('ProgramEncounter')
                .filtered('maxVisitDateTime=null and earliestVisitDateTime!=null');
            for (let i = 0; i < oblongProgramEncounters.length; i++) {
                newDB.create('EntityQueue', EntityQueue.create(oblongProgramEncounters[i], 'ProgramEncounter', new Date()));
                oblongProgramEncounters[i].earliestVisitDateTime = null;
            }
        }
        if (oldDB.schemaVersion < 83) {
            _.forEach([... newDB.objects('Settings')], settings => {
                if (settings.pageSize === 0 || settings.pageSize === undefined || settings.pageSize === null) {
                    settings.pageSize = 100;
                }
            });
        }
        if (oldDB.schemaVersion < 87) {
            _.forEach(newDB.objects("ChecklistItemDetail"), item => (item.scheduleOnExpiryOfDependency = false));
        }
        if (oldDB.schemaVersion < 90) {
            _.forEach(newDB.objects('Settings'), item => (item.devSkipValidation = false));
        }
    }
};
