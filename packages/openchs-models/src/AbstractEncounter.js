import _ from "lodash";
import ValidationResult from "./application/ValidationResult";
import BaseEntity from "./BaseEntity";
import EncounterType from "./EncounterType";
import ObservationsHolder from "./ObservationsHolder";
import General from "./utility/General";
import ResourceUtil from "./utility/ResourceUtil";

class AbstractEncounter extends BaseEntity {
    static fieldKeys = {
        ENCOUNTER_DATE_TIME: 'ENCOUNTER_DATE_TIME',
        COMPLETION_DATE: 'COMPLETION_DATE'
    };

    validate() {
        return _.isNil(this.encounterDateTime) ?
            [new ValidationResult(false, AbstractEncounter.fieldKeys.ENCOUNTER_DATE_TIME, "emptyValidationMessage")] : [ValidationResult.successful(AbstractEncounter.fieldKeys.ENCOUNTER_DATE_TIME)];
    }

    get toResource() {
        const resource = _.pick(this, ["uuid", "voided"]);
        resource["encounterTypeUUID"] = this.encounterType.uuid;
        resource["observations"] = [];
        this.observations.forEach((obs) => {
            resource["observations"].push(obs.toResource);
        });
        return resource;
    }

    static createEmptyInstance(encounter) {
        encounter.voided = false;
        return encounter;
    }

    cloneForEdit(encounter) {
        encounter.uuid = this.uuid;
        encounter.encounterType = _.isNil(this.encounterType) ? null : this.encounterType.clone();
        encounter.encounterDateTime = this.encounterDateTime;
        encounter.observations = ObservationsHolder.clone(this.observations);
        encounter.voided = this.voided;
        return encounter;
    }

    static fromResource(resource, entityService, encounter) {
        const programEncounter = General.assignFields(resource, encounter, ["uuid", "voided"], ["encounterDateTime"], ["observations", "cancelObservations"], entityService);
        programEncounter.encounterType = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(resource, "encounterTypeUUID"), EncounterType.schema.name);
        return encounter;
    }

    getEncounterDateValues() {
        const dateValues = {};
        dateValues[AbstractEncounter.fieldKeys.ENCOUNTER_DATE_TIME] = this.encounterDateTime;
        return dateValues;
    }

    findObservation(conceptName) {
        return _.find(this.observations, (observation) => {
            return observation.concept.name === conceptName
        });
    }

    findCancelEncounterObservation(conceptName) {
        return _.find(this.cancelObservations, (observation) => {
            return observation.concept.name === conceptName
        });
    }

    findCancelEncounterObservationReadableValue(conceptName){
        const observationForConcept = this.findCancelEncounterObservation(conceptName);
        return _.isEmpty(observationForConcept) ? observationForConcept : observationForConcept.getReadableValue();
    }

    getObservationValue(conceptName) {
        const observationForConcept = this.findObservation(conceptName);
        return _.isEmpty(observationForConcept) ? observationForConcept : observationForConcept.getValue();
    }

    getObservationReadableValue(conceptName) {
        const observationForConcept = this.findObservation(conceptName);
        return _.isEmpty(observationForConcept) ? observationForConcept : observationForConcept.getReadableValue();
    }

    getObservations() {
        return _.isEmpty(this.observations) ? [] : this.observations;
    }

    addObservation(obs) {
        this.observations.push(obs);
    }

    hasBeenEdited() {
        return !!this.encounterDateTime;
    }

    isCancelled() {
        return !!this.cancelDateTime;
    }

    isScheduled() {
        return _.isNil(this.encounterDateTime) && _.isNil(this.cancelDateTime);
    }

    hasObservation(conceptName) {
        return !_.isNil(this.getObservationValue(conceptName));
    }

    get subjectType() {
        return _.get(this, this.getName() === 'Encounter'? 'individual.subjectType': 'programEnrolment.individual.subjectType');
    }
}

export default AbstractEncounter;
