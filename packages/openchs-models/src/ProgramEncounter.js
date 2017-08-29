import General from "./utility/General";
import ResourceUtil from "./utility/ResourceUtil";
import ProgramEnrolment from "./ProgramEnrolment";
import AbstractEncounter from "./AbstractEncounter";
import _ from 'lodash';
import moment from "moment";
import ValidationResult from "./application/ValidationResult";
import ObservationRule from './observation/ObservationRule';

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
            scheduledDateTime: {type: 'date', optional: true},
            maxDateTime: {type: 'date', optional: true},
            encounterDateTime: {type: 'date', optional: true},
            programEnrolment: 'ProgramEnrolment',
            observations: {type: 'list', objectType: 'Observation'}
        }
    };

    static fromResource(resource, entityService) {
        const programEncounter = AbstractEncounter.fromResource(resource, entityService, new ProgramEncounter());

        programEncounter.programEnrolment = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(resource, "programEnrolmentUUID"), ProgramEnrolment.schema.name);
        General.assignDateFields(["scheduledDateTime", "maxDateTime"], resource, programEncounter);
        programEncounter.name = resource.name;
        return programEncounter;
    }

    get toResource() {
        const resource = super.toResource;
        if (!_.isNil(this.encounterDateTime))
            resource.encounterDateTime = moment(this.encounterDateTime).format();
        resource.programEnrolmentUUID = this.programEnrolment.uuid;
        resource.name = this.name;
        if (!_.isNil(this.scheduledDateTime))
            resource.scheduledDateTime = moment(this.scheduledDateTime).format();
        if (!_.isNil(this.maxDateTime))
            resource.maxDateTime = moment(this.maxDateTime).format();
        return resource;
    }

    static createEmptyInstance() {
        const programEncounter = new ProgramEncounter();
        programEncounter.uuid = General.randomUUID();
        programEncounter.observations = [];
        programEncounter.encounterDateTime = new Date();
        return programEncounter;
    }

    cloneForEdit() {
        const programEncounter = super.cloneForEdit(new ProgramEncounter());
        programEncounter.programEnrolment = this.programEnrolment;
        programEncounter.name = this.name;
        programEncounter.scheduledDateTime = this.scheduledDateTime;
        programEncounter.maxDateTime = this.maxDateTime;
        return programEncounter;
    }

    getEncounterDateValues() {
        const encounterDateValues = super.getEncounterDateValues();
        encounterDateValues[ProgramEncounter.fieldKeys.SCHEDULED_DATE_TIME] = this.scheduledDateTime;
        encounterDateValues[ProgramEncounter.fieldKeys.MAX_DATE_TIME] = this.maxDateTime;
        return encounterDateValues;
    }

    validate() {
        const validationResults = super.validate();
        if (!_.isNil(this.encounterDateTime) &&
            (General.dateAIsBeforeB(this.encounterDateTime, this.programEnrolment.enrolmentDateTime) || General.dateAIsAfterB(this.encounterDateTime, this.programEnrolment.programExitDateTime)))
            validationResults.push(new ValidationResult(false, AbstractEncounter.fieldKeys.ENCOUNTER_DATE_TIME, 'encounterDateNotInBetweenEnrolmentAndExitDate'));
        return validationResults;
    }

    static createScheduledProgramEncounter(encounterType, programEnrolment) {
        const programEncounter = ProgramEncounter.createEmptyInstance();
        programEncounter.encounterType = encounterType;
        programEncounter.programEnrolment = programEnrolment;
        programEncounter.encounterDateTime = null;
        return programEncounter;
    }

    updateSchedule(scheduledVisit) {
        this.scheduledDateTime = scheduledVisit.dueDate;
        this.maxDateTime = scheduledVisit.maxDate;
        this.name = scheduledVisit.name;
    }

    getName() {
        return 'ProgramEncounter';
    }

    get numberOfWeeksSinceEnrolment() {
        return General.weeksBetween(this.encounterDateTime, this.programEnrolment.enrolmentDateTime);
    }

    numberOfWeeksSince(conceptName) {
        const obs = this.programEnrolment.findObservationInEntireEnrolment(conceptName, this);
        return General.weeksBetween(this.encounterDateTime, obs.getValue());
    }

    isObservationAllowed(observationRules, concept, numberOfWeeksSinceEnrolment) {
        const obsRule = _.find(observationRules, (x) => x.conceptName === concept.name);
        if (!_.isNil(obsRule)) {
            const numberOfWeeksSince = obsRule.validityBasedOn === ObservationRule.ENROLMENT_DATE_VALIDITY ? numberOfWeeksSinceEnrolment : this.numberOfWeeksSince(obsRule.validityBasedOn);
            const observation = this.programEnrolment.findObservationInEntireEnrolment(obsRule.conceptName);
            if (obsRule.allowedOccurrences === 1 && !_.isNil(observation))
                return false;

            if (numberOfWeeksSince < obsRule.validFrom || numberOfWeeksSince > obsRule.validTill)
                return false;
        }

        return true;
    }

    removeObservationsNotAllowed(observationRules) {
        _.remove(this.observations, (obs) => !this.isObservationAllowed(observationRules, obs.concept, this.numberOfWeeksSinceEnrolment));
    }

    toJSON() {
        return {
            uuid: this.uuid,
            name: this.name,
            encounterType: this.encounterType,
            maxDateTime: this.maxDateTime,
            encounterDateTime: this.encounterDateTime,
            programEnrolmentUUID: this.programEnrolment.uuid,
            observations: this.observations
        };
    }
}

export default ProgramEncounter;