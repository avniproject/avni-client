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
            individual: 'Individual'
        }
    };

    static createEmptyInstance() {
        const programEnrolment = new ProgramEnrolment();
        programEnrolment.uuid = General.randomUUID();
        programEnrolment.enrolmentDateTime = new Date();
        programEnrolment.observations = [];
        programEnrolment.programExitObservations = [];
        programEnrolment.encounters = [];
        programEnrolment.checklists = [];
        programEnrolment.individual = Individual.createEmptyInstance();
        return programEnrolment;
    }

    static fromObject(enrolment) {
        const programEnrolment = new ProgramEnrolment();
        programEnrolment.uuid = enrolment.uuid;
        programEnrolment.program = enrolment.program;
        programEnrolment.enrolmentDateTime = enrolment.enrolmentDateTime;
        programEnrolment.observations = enrolment.observations;
        programEnrolment.programExitObservations = enrolment.programExitObservations;
        programEnrolment.encounters = enrolment.encounters;
        programEnrolment.checklists = enrolment.checklists;
        return programEnrolment;
    }

    get toResource() {
        const resource = _.pick(this, ["uuid"]);
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

        const programEnrolment = General.assignFields(resource, new ProgramEnrolment(), ["uuid"], ["enrolmentDateTime", "programExitDateTime"], ["observations", "programExitObservations"], entityService);
        programEnrolment.program = program;
        programEnrolment.individual = individual;

        if (!_.isNil(programOutcomeUUID)) {
            programEnrolment.programOutcome = entityService.findByKey("uuid", programOutcomeUUID, ProgramOutcome.schema.name);
        }

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
        programEnrolment.checklists = [];
        this.checklists.forEach((x) => {
            const checklist = new Checklist();
            checklist.uuid = x.uuid;
            programEnrolment.checklists.push(checklist);
        });
        return programEnrolment;
    }

    static validationKeys = {
        ENROLMENT_DATE: 'ENROLMENT_DATE',
        EXIT_DATE: 'EXIT_DATE',
    };

    validateEnrolment() {
        const validationResults = [];
        validationResults.push(this.validateFieldForEmpty(this.enrolmentDateTime, ProgramEnrolment.validationKeys.ENROLMENT_DATE));
        if (!_.isNil(this.enrolmentDateTime) && General.dateAIsBeforeB(this.enrolmentDateTime, this.individual.registrationDate))
            validationResults.push(new ValidationResult(false, ProgramEnrolment.validationKeys.ENROLMENT_DATE, 'enrolmentDateBeforeRegistrationDate'));
        return validationResults;
    }

    validateExit() {
        const validationResults = [];
        validationResults.push(this.validateFieldForEmpty(this.programExitDateTime, ProgramEnrolment.validationKeys.EXIT_DATE));
        if (!_.isNil(this.programExitDateTime) && General.dateAIsBeforeB(this.programExitDateTime, this.enrolmentDateTime))
            validationResults.push(new ValidationResult(false, ProgramEnrolment.validationKeys.EXIT_DATE, 'exitDateBeforeEnrolmentDate'));
        return validationResults;
    }

    lastFulfilledEncounter(...encounterTypeNames) {
        return _.chain(this.encounters)
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
            .map((observation) => {return {encounterDateTime: observation.encounterDateTime, obs: observation.obs.getValue()}})
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

    createChecklists(expectedChecklists, conceptFinder) {
        const checklists = [];
        expectedChecklists.forEach((expectedChecklist) => {
            const checklist = Checklist.create();
            checklist.name = expectedChecklist.name;
            checklist.baseDate = expectedChecklist.baseDate;
            checklist.addChecklistItems(expectedChecklist, conceptFinder);
            checklists.push(checklist);
        });
        return checklists;
    }

    get hasChecklist() {
        return 0 !== this.checklists.length;
    }

    findChecklist(name) {
        return _.find(this.checklists, (checklist) => checklist.name === name);
    }

    _getEncounters(removeCancelledEncounters) {
        return _.chain(this.encounters)
            .filter((encounter) => removeCancelledEncounters ? _.isNil(encounter.cancelDateTime) : true)
            .sortBy((encounter) => moment().diff(encounter.encounterDateTime));
    }

    getEncounters(removeCancelledEncounters) {
        return this._getEncounters(removeCancelledEncounters).value();
    }

    findObservationInEntireEnrolment(conceptName, currentEncounter) {
        const encounters = _.chain(this.getEncounters())
            .filter((enc) => currentEncounter ? enc.uuid !== currentEncounter.uuid : true)
            .concat(currentEncounter)
            .compact()
            .sortBy((enc) => enc.encounterDateTime)
            .value();

        return this._findObservationFromEntireEnrolment(conceptName, encounters, true);
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
        var observation;
        for (var i = 0; i < encounters.length; i++) {
            observation = encounters[i].findObservation(conceptName);
            if (!_.isNil(observation)) break;
        }

        if (_.isNil(observation) && checkInEnrolment)
            return this.findObservation(conceptName);

        return observation;
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

    scheduledEncounters() {
        return _.filter(this.encounters, (encounter) => !encounter.encounterDateTime && _.isNil(encounter.cancelDateTime));
    }

    scheduledEncountersOfType(encounterTypeName) {
        return this.scheduledEncounters()
            .filter((scheduledEncounter) => scheduledEncounter.encounterType.name === encounterTypeName);
    }

    addObservation(observation) {
        this.observations.push(observation);
    }

    findEncounter(encounterTypeName, encounterName) {
        return this.encounters.find(function (encounter) {
            return encounter.encounterType.name === encounterTypeName && encounter.name === encounterName;
        });
    }

    hasEncounter(encounterTypeName, encounterName) {
        return !_.isNil(this.findEncounter(encounterTypeName, encounterName));
    }

    hasEncounterOfType = (encounterTypeName) =>
        !_.isNil(this.encounters.find(encounter => encounter.encounterType.name === encounterTypeName));

    hasAnyOfEncounterTypes(encounterTypeNames = []) {
        return encounterTypeNames.some(this.hasEncounterOfType);
    }

    //get has been taken by the prototype
    getObservationValue(conceptName) {
        const observationValue = this.findObservation(conceptName);
        return _.isEmpty(observationValue) ? undefined : observationValue.getValue();
    }

    getObservationReadableValue(conceptName) {
        return this.findObservation(conceptName).getReadableValue();
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
            individualUUID: this.individual.uuid
        };
    }
}

export default ProgramEnrolment;