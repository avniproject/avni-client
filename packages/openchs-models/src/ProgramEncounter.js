import General from "./utility/General";
import ResourceUtil from "./utility/ResourceUtil";
import ProgramEnrolment from "./ProgramEnrolment";
import AbstractEncounter from "./AbstractEncounter";
import _ from 'lodash';
import moment from "moment";
import ValidationResult from "./application/ValidationResult";
import ObservationsHolder from "./ObservationsHolder";

class ProgramEncounter extends AbstractEncounter {
    static fieldKeys = {
        SCHEDULED_DATE_TIME: 'SCHEDULED_DATE_TIME',
        MAX_DATE_TIME: 'MAX_DATE_TIME'
    };

    static schema = {
        name: 'ProgramEncounter',
        primaryKey: 'uuid',
        properties: {
            uuid: 'string',
            name: {type: 'string', optional: true},
            encounterType: 'EncounterType',
            earliestVisitDateTime: {type: 'date', optional: true},
            maxVisitDateTime: {type: 'date', optional: true},
            encounterDateTime: {type: 'date', optional: true},
            programEnrolment: 'ProgramEnrolment',
            observations: {type: 'list', objectType: 'Observation'},
            cancelDateTime: {type: 'date', optional: true},
            cancelObservations: {type: 'list', objectType: 'Observation'}
        }
    };

    static fromResource(resource, entityService) {
        const programEncounter = AbstractEncounter.fromResource(resource, entityService, new ProgramEncounter());

        programEncounter.programEnrolment = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(resource, "programEnrolmentUUID"), ProgramEnrolment.schema.name);
        General.assignDateFields(["earliestVisitDateTime", "maxVisitDateTime"], resource, programEncounter);
        programEncounter.name = resource.name;
        return programEncounter;
    }

    get toResource() {
        const resource = super.toResource;
        if (!_.isNil(this.encounterDateTime))
            resource.encounterDateTime = moment(this.encounterDateTime).format();
        resource.programEnrolmentUUID = this.programEnrolment.uuid;
        resource.name = this.name;
        if (!_.isNil(this.earliestVisitDateTime))
            resource.earliestVisitDateTime = moment(this.earliestVisitDateTime).format();
        if (!_.isNil(this.maxVisitDateTime))
            resource.maxVisitDateTime = moment(this.maxVisitDateTime).format();
        if (!_.isNil(this.cancelDateTime))
            resource.cancelDateTime = moment(this.cancelDateTime).format();
        console.log(this.cancelObservations);
        resource.cancelObservations = _.map(this.cancelObservations, (obs) => { return obs.toResource});
        return resource;
    }

    static createEmptyInstance() {
        const programEncounter = new ProgramEncounter();
        programEncounter.uuid = General.randomUUID();
        programEncounter.observations = [];
        programEncounter.cancelObservations = [];
        programEncounter.encounterDateTime = new Date();
        return programEncounter;
    }

    cloneForEdit() {
        const programEncounter = super.cloneForEdit(new ProgramEncounter());
        programEncounter.programEnrolment = this.programEnrolment;
        programEncounter.name = this.name;
        programEncounter.earliestVisitDateTime = this.earliestVisitDateTime;
        programEncounter.maxVisitDateTime = this.maxVisitDateTime;
        programEncounter.cancelDateTime = this.cancelDateTime;
        programEncounter.cancelObservations = ObservationsHolder.clone(this.cancelObservations);

        return programEncounter;
    }

    getEncounterDateValues() {
        const encounterDateValues = super.getEncounterDateValues();
        encounterDateValues[ProgramEncounter.fieldKeys.SCHEDULED_DATE_TIME] = this.earliestVisitDateTime;
        encounterDateValues[ProgramEncounter.fieldKeys.MAX_DATE_TIME] = this.maxVisitDateTime;
        return encounterDateValues;
    }

    validate() {
        const validationResults = super.validate();
        if (!_.isNil(this.encounterDateTime) &&
            (General.dateAIsBeforeB(this.encounterDateTime, this.programEnrolment.enrolmentDateTime) || General.dateAIsAfterB(this.encounterDateTime, this.programEnrolment.programExitDateTime)))
            validationResults.push(new ValidationResult(false, AbstractEncounter.fieldKeys.ENCOUNTER_DATE_TIME, 'encounterDateNotInBetweenEnrolmentAndExitDate'));
        return validationResults;
    }

    isCancellable() {
        return !this.hasBeenEdited() && !this.isCancelled();
    }

    static createScheduledProgramEncounter(encounterType, programEnrolment) {
        const programEncounter = ProgramEncounter.createEmptyInstance();
        programEncounter.encounterType = encounterType;
        programEncounter.programEnrolment = programEnrolment;
        programEncounter.encounterDateTime = null;
        return programEncounter;
    }

    updateSchedule(scheduledVisit) {
        this.earliestVisitDateTime = scheduledVisit.earliestDate;
        this.maxVisitDateTime = scheduledVisit.maxDate;
        this.name = scheduledVisit.name;
    }

    getName() {
        return 'ProgramEncounter';
    }

    findObservationInEntireEnrolment(conceptName) {
        return this.programEnrolment.findObservationInEntireEnrolment(conceptName);
    }

    observationExistsInEntireEnrolment(conceptName) {
        return !_.isNil(this.programEnrolment.findObservationInEntireEnrolment(conceptName));
    }

    toJSON() {
        return {
            uuid: this.uuid,
            name: this.name,
            encounterType: this.encounterType,
            maxVisitDateTime: this.maxVisitDateTime,
            encounterDateTime: this.encounterDateTime,
            programEnrolmentUUID: this.programEnrolment.uuid,
            observations: this.observations
        };
    }
}

export default ProgramEncounter;