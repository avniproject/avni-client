import General from "./utility/General";
import ResourceUtil from "./utility/ResourceUtil";
import ProgramEnrolment from "./ProgramEnrolment";
import AbstractEncounter from "./AbstractEncounter";
import _ from 'lodash';
import moment from "moment";
import ValidationResult from "./application/ValidationResult";
import ObservationsHolder from "./ObservationsHolder";
import {findMediaObservations} from "./Media";
import Point from "./geo/Point";

class ProgramEncounter extends AbstractEncounter {
    static fieldKeys = {
        SCHEDULED_DATE_TIME: 'SCHEDULED_DATE_TIME',
        MAX_DATE_TIME: 'MAX_DATE_TIME'
    };

    static validationKeys = {
        ENCOUNTER_LOCATION: 'ENCOUNTER_LOCATION',
        CANCEL_LOCATION: 'CANCEL_LOCATION'
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
            cancelObservations: {type: 'list', objectType: 'Observation'},
            encounterLocation: {type: 'Point', optional: true},
            cancelLocation: {type: 'Point', optional: true}
        }
    };

    static fromResource(resource, entityService) {
        const programEncounter = AbstractEncounter.fromResource(resource, entityService, new ProgramEncounter());

        programEncounter.programEnrolment = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(resource, "programEnrolmentUUID"), ProgramEnrolment.schema.name);
        General.assignDateFields(["earliestVisitDateTime", "maxVisitDateTime", "cancelDateTime"], resource, programEncounter);
        programEncounter.name = resource.name;

        if(!_.isNil(resource.encounterLocation))
            programEncounter.encounterLocation = Point.fromResource(resource.encounterLocation);

        if(!_.isNil(resource.cancelLocation))
            programEncounter.cancelLocation = Point.fromResource(resource.cancelLocation);

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
        resource.cancelObservations = _.map(this.cancelObservations, (obs) => {
            return obs.toResource
        });
        if(!_.isNil(this.encounterLocation)) {
            resource["encounterLocation"] = this.encounterLocation.toResource;
        }
        if(!_.isNil(this.cancelLocation)) {
            resource["cancelLocation"] = this.cancelLocation.toResource;
        }
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

    getRealEventDate() {
        return _.isNil(this.encounterDateTime) ? this.earliestVisitDateTime : this.encounterDateTime;
    }

    cloneForEdit() {
        const programEncounter = super.cloneForEdit(new ProgramEncounter());
        programEncounter.programEnrolment = this.programEnrolment;
        programEncounter.name = this.name;
        programEncounter.earliestVisitDateTime = this.earliestVisitDateTime;
        programEncounter.maxVisitDateTime = this.maxVisitDateTime;
        programEncounter.cancelDateTime = this.cancelDateTime;
        programEncounter.cancelObservations = ObservationsHolder.clone(this.cancelObservations);
        programEncounter.encounterLocation = _.isNil(this.encounterLocation) ? null : this.encounterLocation.clone();
        programEncounter.cancelLocation = _.isNil(this.cancelLocation) ? null : this.cancelLocation.clone();
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
        if(!_.isNil(this.encounterDateTime) && General.dateIsAfterToday(this.encounterDateTime))
            validationResults.push(new ValidationResult(false, AbstractEncounter.fieldKeys.ENCOUNTER_DATE_TIME, 'encounterDateInFuture'));
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

    getAllScheduledVisits() {
        return this.programEnrolment.getAllScheduledVisits(this);
    }

    updateSchedule(scheduledVisit) {
        this.earliestVisitDateTime = scheduledVisit.earliestDate;
        this.maxVisitDateTime = scheduledVisit.maxDate;
        this.name = scheduledVisit.name;
        return this;
    }

    getName() {
        return 'ProgramEncounter';
    }

    findObservationInEntireEnrolment(conceptName) {
        return this.programEnrolment.findObservationInEntireEnrolment(conceptName);
    }

    findLatestObservationInEntireEnrolment(conceptName, currentEncounter) {
        return this.programEnrolment.findLatestObservationInEntireEnrolment(conceptName, currentEncounter);
    }

    observationExistsInEntireEnrolment(conceptName) {
        return !_.isNil(this.programEnrolment.findObservationInEntireEnrolment(conceptName));
    }

    getObservations() {
        return _.isEmpty(this.observations) ? this.cancelObservations : this.observations;
    }

    getObservationReadableValue(conceptName) {
        const obs = _.find(this.observations, (observation) => observation.concept.name === conceptName);
        return _.isNil(obs) ? null : obs.getReadableValue();
    }

    findMediaObservations() {
        return findMediaObservations(
            ObservationsHolder.clone(this.observations),
            ObservationsHolder.clone(this.cancelObservations)
        );
    }

    replaceObservation(originalValue, newValue) {
        new ObservationsHolder(this.observations).updateObservationBasedOnValue(originalValue, newValue);
        new ObservationsHolder(this.cancelObservations).updateObservationBasedOnValue(originalValue, newValue);
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
