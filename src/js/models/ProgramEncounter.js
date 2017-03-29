import General from "../utility/General";
import ResourceUtil from "../utility/ResourceUtil";
import ProgramEnrolment from "./ProgramEnrolment";
import AbstractEncounter from "./AbstractEncounter";
import _ from 'lodash';
import moment from "moment";
import ValidationResult from "./application/ValidationResult";

class ProgramEncounter extends AbstractEncounter {
    static fieldKeys = {
        SCHEDULED_DATE_TIME: 'SCHEDULED_DATE_TIME'
    };

    static schema = {
        name: 'ProgramEncounter',
        primaryKey: 'uuid',
        properties: {
            uuid: 'string',
            encounterType: 'EncounterType',
            scheduledDateTime: {type: 'date', optional: true},
            encounterDateTime: {type: 'date', optional: true},
            programEnrolment: 'ProgramEnrolment',
            observations: {type: 'list', objectType: 'Observation'}
        }
    };

    static fromResource(resource, entityService) {
        const programEncounter = AbstractEncounter.fromResource(resource, entityService, new ProgramEncounter());

        programEncounter.programEnrolment = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(resource, "programEnrolmentUUID"), ProgramEnrolment.schema.name);
        programEncounter.scheduledDateTime = resource["scheduledDateTime"];
        return programEncounter;
    }

    get toResource() {
        const resource = super.toResource;
        resource["programEnrolmentUUID"] = this.programEnrolment.uuid;
        return resource;
    }

    static createEmptyInstance() {
        const programEncounter = new ProgramEncounter();
        programEncounter.uuid = General.randomUUID();
        programEncounter.observations = [];
        return programEncounter;
    }

    cloneForEdit() {
        const programEncounter = super.cloneForEdit(new ProgramEncounter());
        programEncounter.programEnrolment = this.programEnrolment;
        return programEncounter;
    }

    getEncounterDateValues() {
        const encounterDateValues = super.getEncounterDateValues();
        encounterDateValues[ProgramEncounter.fieldKeys.SCHEDULED_DATE_TIME] = this.scheduledDateTime;
        return encounterDateValues;
    }

    validate() {
        const validationResults = super.validate();
        if (!_.isNil(this.encounterDateTime) &&
            (moment(this.encounterDateTime).isBefore(this.programEnrolment.enrolmentDateTime) || moment(this.encounterDateTime).isAfter(this.programEnrolment.programExitDateTime)))
            validationResults.push(new ValidationResult(false, AbstractEncounter.fieldKeys.ENCOUNTER_DATE_TIME, 'encounterDateNotInBetweenEnrolmentAndExitDate'));
        return validationResults;
    }
}

export default ProgramEncounter;