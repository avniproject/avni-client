import General from "./utility/General";
import ResourceUtil from "./utility/ResourceUtil";
import Program from "./Program";
import ProgramOutcome from "./ProgramOutcome";
import ProgramEncounter from "./ProgramEncounter";
import BaseEntity from "./BaseEntity";
import Individual from "./Individual";
import _ from "lodash";
import moment from "moment";
import ObservationsHolder from "./ObservationsHolder";
import ValidationResult from "./application/ValidationResult";
import Checklist from "./Checklist";
import {findMediaObservations} from "./Media";
import Point from "./geo/Point";

class ProgramEnrolment extends BaseEntity {
    static schema = {
        name: 'ProgramEnrolment',
        primaryKey: 'uuid',
        properties: {
            uuid: 'string',
            program: 'Program',
            enrolmentDateTime: 'date',
            observations: {type: 'list', objectType: 'Observation'},
            programExitDateTime: {type: 'date', optional: true},
            programExitObservations: {type: 'list', objectType: 'Observation'},
            programOutcome: {type: 'ProgramOutcome', optional: true},
            encounters: {type: 'list', objectType: 'ProgramEncounter'},
            checklists: {type: 'list', objectType: 'Checklist'},
            individual: 'Individual',
            enrolmentLocation: {type: 'Point', optional: true},
            exitLocation: {type: 'Point', optional: true},
            voided: {type: 'bool', default: false}
        }
    };

    static createEmptyInstance({individual, program} = {}) {
        const programEnrolment = new ProgramEnrolment();
        programEnrolment.uuid = General.randomUUID();
        programEnrolment.enrolmentDateTime = new Date();
        programEnrolment.observations = [];
        programEnrolment.programExitObservations = [];
        programEnrolment.encounters = [];
        programEnrolment.checklists = [];
        programEnrolment.individual = individual ? individual.cloneForEdit() : Individual.createEmptyInstance();
        programEnrolment.voided = false;
        programEnrolment.program = program;
        ObservationsHolder.convertObsForSave(programEnrolment.individual.observations);
        return programEnrolment;
    }

    get toResource() {
        const resource = _.pick(this, ["uuid", "voided"]);
        resource["programUUID"] = this.program.uuid;
        resource.enrolmentDateTime = General.isoFormat(this.enrolmentDateTime);
        resource.programExitDateTime = General.isoFormat(this.programExitDateTime);
        resource["programOutcomeUUID"] = _.isNil(this.programOutcome) ? null : this.programOutcome.uuid;
        resource["individualUUID"] = this.individual.uuid;
        if (!_.isNil(this.checklist)) resource["checklistUUID"] = this.checklist.uuid;

        resource["observations"] = [];
        this.observations.forEach((obs) => {
            resource["observations"].push(obs.toResource);
        });


        if (!_.isNil(this.enrolmentLocation)) {
            resource["enrolmentLocation"] = this.enrolmentLocation.toResource;
        }
        if (!_.isNil(this.exitLocation)) {
            resource["exitLocation"] = this.exitLocation.toResource;
        }

        resource["programExitObservations"] = [];
        this.programExitObservations.forEach((obs) => {
            resource["programExitObservations"].push(obs.toResource);
        });

        return resource;
    }

    static fromResource(resource, entityService) {
        const program = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(resource, "programUUID"), Program.schema.name);
        const programOutcomeUUID = ResourceUtil.getUUIDFor(resource, "programOutcomeUUID");
        const individual = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(resource, "individualUUID"), Individual.schema.name);

        const programEnrolment = General.assignFields(resource, new ProgramEnrolment(), ["uuid", "voided"], ["enrolmentDateTime", "programExitDateTime"], ["observations", "programExitObservations"], entityService);
        programEnrolment.program = program;
        programEnrolment.individual = individual;

        if (!_.isNil(programOutcomeUUID)) {
            programEnrolment.programOutcome = entityService.findByKey("uuid", programOutcomeUUID, ProgramOutcome.schema.name);
        }

        if (!_.isNil(resource.enrolmentLocation))
            programEnrolment.enrolmentLocation = Point.fromResource(resource.enrolmentLocation);

        if (!_.isNil(resource.exitLocation))
            programEnrolment.exitLocation = Point.fromResource(resource.exitLocation);

        return programEnrolment;
    }

    static merge = (childEntityClass) =>
        BaseEntity.mergeOn(new Map([[ProgramEncounter, 'encounters'], [Checklist, "checklists"]]).get(childEntityClass));

    static associateChild(child, childEntityClass, childResource, entityService) {
        var programEnrolment = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(childResource, "programEnrolmentUUID"), ProgramEnrolment.schema.name);
        programEnrolment = General.pick(programEnrolment, ["uuid"], ["encounters", "checklists"]);
        if (childEntityClass === ProgramEncounter)
            BaseEntity.addNewChild(child, programEnrolment.encounters);
        else if (childEntityClass === Checklist)
            BaseEntity.addNewChild(child, programEnrolment.checklists);
        else
            throw `${childEntityClass.name} not support by ${ProgramEnrolment.name}`;
        return programEnrolment;
    }

    nonVoidedEncounters() {
        return this.encounters.filter(enc => !enc.voided);
    }

    getChecklists() {
        return _.isEmpty(this.checklists) ? [] : this.checklists;
    }

    cloneForEdit() {
        const programEnrolment = new ProgramEnrolment();
        programEnrolment.uuid = this.uuid;
        programEnrolment.program = _.isNil(this.program) ? null : this.program.clone();
        programEnrolment.enrolmentDateTime = this.enrolmentDateTime;
        programEnrolment.programExitDateTime = this.programExitDateTime;
        programEnrolment.programOutcome = _.isNil(this.programOutcome) ? null : this.programOutcome.clone();
        programEnrolment.individual = this.individual;
        programEnrolment.observations = ObservationsHolder.clone(this.observations);
        programEnrolment.programExitObservations = ObservationsHolder.clone(this.programExitObservations);
        programEnrolment.encounters = this.encounters;
        programEnrolment.checklists = _.map(this.checklists, list => list.clone());
        programEnrolment.enrolmentLocation = _.isNil(this.enrolmentLocation) ? null : this.enrolmentLocation.clone();
        programEnrolment.exitLocation = _.isNil(this.exitLocation) ? null : this.exitLocation.clone();
        programEnrolment.voided = this.voided;
        return programEnrolment;
    }

    static validationKeys = {
        ENROLMENT_DATE: 'ENROLMENT_DATE',
        EXIT_DATE: 'EXIT_DATE',
        ENROLMENT_LOCATION: 'ENROLMENT_LOCATION',
        EXIT_LOCATION: 'EXIT_LOCATION'
    };

    validateEnrolment() {
        const validationResults = [];
        validationResults.push(this.validateFieldForEmpty(this.enrolmentDateTime, ProgramEnrolment.validationKeys.ENROLMENT_DATE));
        if (!_.isNil(this.enrolmentDateTime) && General.dateAIsBeforeB(this.enrolmentDateTime, this.individual.registrationDate))
            validationResults.push(new ValidationResult(false, ProgramEnrolment.validationKeys.ENROLMENT_DATE, 'enrolmentDateBeforeRegistrationDate'));
        if (!_.isNil(this.enrolmentDateTime) && General.dateIsAfterToday(this.enrolmentDateTime))
            validationResults.push(new ValidationResult(false, ProgramEnrolment.validationKeys.ENROLMENT_DATE, 'enrolmentDateInFuture'));
        return validationResults;
    }

    validateExit() {
        const validationResults = [];
        validationResults.push(this.validateFieldForEmpty(this.programExitDateTime, ProgramEnrolment.validationKeys.EXIT_DATE));
        if (!_.isNil(this.programExitDateTime) && General.dateAIsBeforeB(this.programExitDateTime, this.enrolmentDateTime))
            validationResults.push(new ValidationResult(false, ProgramEnrolment.validationKeys.EXIT_DATE, 'exitDateBeforeEnrolmentDate'));
        if (!_.isNil(this.programExitDateTime) && General.dateIsAfterToday(this.programExitDateTime))
            validationResults.push(new ValidationResult(false, ProgramEnrolment.validationKeys.EXIT_DATE, 'exitDateInFuture'));
        return validationResults;
    }

    lastFulfilledEncounter(...encounterTypeNames) {
        return _.chain(this.nonVoidedEncounters())
            .filter((encounter) => _.isEmpty(encounterTypeNames) ? encounter : _.some(encounterTypeNames, (name) => name === _.get(encounter, 'encounterType.name')))
            .filter((encounter) => encounter.encounterDateTime)
            .maxBy((encounter) => encounter.encounterDateTime).value();
    }

    getObservationsForConceptName(conceptName) {
        return _.chain(this.getEncounters(true))
            .map((encounter) => {
                return {
                    encounterDateTime: encounter.encounterDateTime,
                    obs: encounter.findObservation(conceptName)
                }
            })
            .filter((observation) => observation.obs)
            .map((observation) => {
                return {encounterDateTime: observation.encounterDateTime, obs: observation.obs.getValue()}
            })
            .value();
    }

    get isActive() {
        return _.isNil(this.programExitDateTime);
    }

    addEncounter(programEncounter) {
        if (!_.some(this.encounters, (encounter) => encounter.uuid === programEncounter.uuid))
            this.encounters.push(programEncounter);
    }

    addEncounters(...programEncounters) {
        _.each(programEncounters, (programEncounter) => this.addEncounter(programEncounter))
    }

    get hasChecklist() {
        return 0 !== this.checklists.length;
    }

    _getEncounters(removeCancelledEncounters) {
        return _.chain(this.nonVoidedEncounters())
            .filter((encounter) => removeCancelledEncounters ? _.isNil(encounter.cancelDateTime) : true)
            .sortBy((encounter) => moment().diff(encounter.encounterDateTime));
    }

    getEncounters(removeCancelledEncounters) {
        return this._getEncounters(removeCancelledEncounters).value();
    }

    getEncountersOfType(encounterTypeName, removeCancelledEncounters) {
        return this.getEncounters(removeCancelledEncounters).filter((enc) => enc.encounterType.name === encounterTypeName);
    }

    allEncounterTypes() {
        return _.uniqBy(_.map(this.encounters, enc => enc.encounterType), 'uuid');
    }

    findObservationValueInEntireEnrolment(conceptName, checkInEnrolment) {
        let encounters = _.reverse(this.getEncounters(true));
        let observationWithDate = this._findObservationWithDateFromEntireEnrolment(conceptName, encounters, checkInEnrolment);
        if (_.isNil(observationWithDate.observation)) {
            observationWithDate = {observation: this.findObservation(conceptName), date: this.enrolmentDateTime};
        }
        return _.isNil(observationWithDate.observation) ? undefined : {
            value: observationWithDate.observation.getReadableValue(),
            date: observationWithDate.date
        };
    }

    findObservationInEntireEnrolment(conceptName, currentEncounter, latest = false) {
        let encounters = _.chain(this.getEncounters())
            .filter((enc) => currentEncounter ? enc.uuid !== currentEncounter.uuid : true)
            .concat(currentEncounter)
            .compact()
            .sortBy((enc) => enc.encounterDateTime)
            .value();
        encounters = latest ? _.reverse(encounters) : encounters;

        return this._findObservationFromEntireEnrolment(conceptName, encounters, true);
    }

    observationExistsInEntireEnrolment(conceptName, currentEncounter) {
        return !_.isEmpty(this.findObservationInEntireEnrolment(conceptName, currentEncounter));
    }

    findLatestObservationInEntireEnrolment(conceptName, currentEncounter) {
        return this.findObservationInEntireEnrolment(conceptName, currentEncounter, true);
    }

    findLatestObservationFromEncounters(conceptName, currentEncounter, checkInEnrolment = false) {
        const encountersFromEnrolment = _.chain(this.getEncounters())
            .filter((enc) => enc.encounterDateTime)
            .filter((enc) => currentEncounter ? enc.encounterDateTime < currentEncounter.encounterDateTime : true)
            .value();

        const encounters = _.chain(currentEncounter)
            .concat(encountersFromEnrolment)
            .compact()
            .value();

        return this._findObservationFromEntireEnrolment(conceptName, encounters, checkInEnrolment);
    }

    findLatestObservationFromPreviousEncounters(conceptName, currentEncounter) {
        const encounters = _.chain(this.getEncounters())
            .filter((enc) => enc.encounterDateTime)
            .filter((enc) => enc.encounterDateTime < currentEncounter.encounterDateTime)
            .value();
        return this._findObservationFromEntireEnrolment(conceptName, encounters, false);
    }

    findLatestPreviousEncounterWithValueForConcept(currentEncounter, conceptName, valueConceptName) {
        const encounters = _.chain(this.getEncounters())
            .filter((enc) => enc.encounterDateTime)
            .filter((enc) => enc.encounterDateTime < currentEncounter.encounterDateTime)
            .value();

        for (let i = 0; i < encounters.length; i++) {
            if (this._encounterContainsAnswerConceptName(encounters[i], conceptName, valueConceptName)) return encounters[i];
        }
        return null;
    }

    _encounterHasObsForConcept(encounter, conceptName) {
        const observation = encounter.getObservationValue(conceptName);
        return !_.isNil(observation);
    }

    findLatestPreviousEncounterWithObservationForConcept(currentEncounter, conceptName) {
        const encounters = _.chain(this.getEncounters())
            .filter((enc) => enc.encounterDateTime)
            .filter((enc) => enc.encounterDateTime < currentEncounter.encounterDateTime)
            .value();

        for (let i = 0; i < encounters.length; i++) {
            if (this._encounterHasObsForConcept(encounters[i], conceptName)) return encounters[i];
        }
        return null;
    }

    findLastEncounterOfType(currentEncounter, encounterTypes = []) {
        return this.findNthLastEncounterOfType(currentEncounter, encounterTypes, 0);
    }

    findNthLastEncounterOfType(currentEncounter, encounterTypes = [], n = 0) {
        return _.chain(this.getEncounters())
            .filter((enc) => enc.encounterDateTime)
            .filter((enc) => enc.encounterDateTime < currentEncounter.encounterDateTime)
            .filter((enc) => encounterTypes.some(encounterType => encounterType === enc.encounterType.name))
            .nth(n)
            .value();
    }

    _encounterContainsAnswerConceptName(encounter, conceptName, valueConceptName) {
        let observation = encounter.findObservation(conceptName);
        return (!_.isNil(observation) && this._containsAnswerConceptName(valueConceptName, observation));
    }

    _containsAnswerConceptName(conceptName, observation) {
        const answerConcept = observation.concept.getPossibleAnswerConcept(conceptName);
        const answerUuid = answerConcept && answerConcept.concept.uuid;
        return observation.getValueWrapper().hasValue(answerUuid);
    }


    _findObservationFromEntireEnrolment(conceptName, encounters, checkInEnrolment = true) {
        return this._findObservationWithDateFromEntireEnrolment(conceptName, encounters, checkInEnrolment).observation;
    }

    _findObservationWithDateFromEntireEnrolment(conceptName, encounters, checkInEnrolment = true) {
        let observation;
        let encounter;
        for (let i = 0; i < encounters.length; i++) {
            encounter = encounters[i];
            observation = encounters[i].findObservation(conceptName);
            if (!_.isNil(observation))
                return {observation: observation, date: encounter.encounterDateTime};
        }

        if (checkInEnrolment) return {observation: this.findObservation(conceptName), date: this.enrolmentDateTime};
        return {};
    }

    getObservationReadableValueInEntireEnrolment(conceptName, programEncounter) {
        let obs = this.findObservationInEntireEnrolment(conceptName, programEncounter);
        return obs ? obs.getReadableValue() : undefined;
    }

    findObservation(conceptName) {
        return _.find(this.observations, (observation) => observation.concept.name === conceptName);
    }

    findExitObservation(conceptName) {
        return _.find(this.programExitObservations, (observation) => observation.concept.name === conceptName);
    }

    addChecklist(checklist) {
        this.checklists = this.getChecklists()
            .filter(c => c.uuid !== checklist.uuid)
            .concat([checklist]);
    }

    scheduledEncounters() {
        return _.filter(this.getEncounters(true), (encounter) => !encounter.encounterDateTime && _.isNil(encounter.cancelDateTime));
    }

    scheduledEncountersOfType(encounterTypeName) {
        return this.scheduledEncounters()
            .filter((scheduledEncounter) => scheduledEncounter.encounterType.name === encounterTypeName);
    }

    getAllScheduledVisits(currentEncounter) {
        return _.defaults(this.scheduledEncounters(true), [])
            .filter(encounter => encounter.uuid !== currentEncounter.uuid)
            .map(_.identity)
            .map(({uuid, name, encounterType, earliestVisitDateTime, maxVisitDateTime}) => ({
                    name: name,
                    encounterType: encounterType.name,
                    earliestDate: earliestVisitDateTime,
                    maxDate: maxVisitDateTime,
                    uuid: uuid
                }
            ));
    }

    addObservation(observation) {
        this.observations.push(observation);
    }

    findEncounter(encounterTypeName, encounterName) {
        return this.nonVoidedEncounters().find(function (encounter) {
            return encounter.encounterType.name === encounterTypeName && encounter.name === encounterName;
        });
    }

    numberOfEncountersOfType(encounterTypeName) {
        return _.countBy(this.nonVoidedEncounters(), (encounter) => {
            return encounter.encounterType.name === encounterTypeName;
        }).true;
    }

    hasEncounter(encounterTypeName, encounterName) {
        return !_.isNil(this.findEncounter(encounterTypeName, encounterName));
    }

    hasCompletedEncounterOfType(encounterTypeName) {
        return _.some(this.nonVoidedEncounters(), encounter => encounter.encounterType.name === encounterTypeName && !_.isNil(encounter.encounterDateTime));
    }

    hasEncounterOfType(encounterTypeName) {
        return !_.isNil(this.nonVoidedEncounters().find(encounter => encounter.encounterType.name === encounterTypeName));
    }

    hasAnyOfEncounterTypes(encounterTypeNames = []) {
        return encounterTypeNames.some(it => this.hasEncounterOfType(it));
    }

    hasEncounterWithObservationValueAfterDate(encounterTypeName, afterDate, conceptName, value) {
        const obsAfterDate =
            _(this.getEncounters())
                .filter(en => moment(en.encounterDateTime).isAfter(afterDate))
                .filter(en => en.encounterType.name === encounterTypeName)
                .find(en => en.getObservationReadableValue(conceptName) === value);
        return !_.isNil(obsAfterDate);
    }

    //get has been taken by the prototype
    getObservationValue(conceptName) {
        const observationValue = this.findObservation(conceptName);
        return _.isEmpty(observationValue) ? undefined : observationValue.getValue();
    }

    getObservationReadableValue(conceptName) {
        const observationValue = this.findObservation(conceptName);
        return _.isNil(observationValue) ? undefined : observationValue.getReadableValue();
    }

    hasObservation(conceptName) {
        return !_.isNil(this.getObservationValue(conceptName));
    }

    findMediaObservations() {
        return findMediaObservations(
            ObservationsHolder.clone(this.observations),
            ObservationsHolder.clone(this.programExitObservations)
        );
    }

    replaceObservation(originalValue, newValue) {
        new ObservationsHolder(this.observations).updateObservationBasedOnValue(originalValue, newValue);
        new ObservationsHolder(this.programExitObservations).updateObservationBasedOnValue(originalValue, newValue);
    }

    toJSON() {
        return {
            uuid: this.uuid,
            program: this.program,
            enrolmentDateTime: this.enrolmentDateTime,
            observations: this.observations,
            programExitDateTime: this.programExitDateTime,
            programExitObservations: this.programExitObservations,
            programOutcome: {type: 'ProgramOutcome', optional: true},
            encounters: this.encounters,
            checklists: this.checklists,
            individualUUID: this.individual.uuid,
            voided: this.voided
        };
    }
}

export default ProgramEnrolment;
