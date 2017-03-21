import General from "../utility/General";
import EncounterType from "./EncounterType";
import Individual from "./Individual";
import ResourceUtil from "../utility/ResourceUtil";
import _ from "lodash";
import moment from "moment";
import ObservationsHolder from "./ObservationsHolder";
import ValidationResult from "./application/ValidationResult";
import BaseEntity from "./BaseEntity";

class Encounter extends BaseEntity {
    static schema = {
        name: 'Encounter',
        primaryKey: 'uuid',
        properties: {
            uuid: 'string',
            encounterType: 'EncounterType',
            encounterDateTime: 'date',
            individual: 'Individual',
            observations: {type: 'list', objectType: 'Observation'}
        }
    };

    static create() {
        let encounter = new Encounter();
        encounter.observations = [];
        return encounter;
    }

    static fromResource(resource, entityService) {
        const encounterType = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(resource, "encounterTypeUUID"), EncounterType.schema.name);
        const individual = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(resource, "individualUUID"), Individual.schema.name);

        const encounter = General.assignFields(resource, new Encounter(), ["uuid"], ["encounterDateTime"], ["observations"], entityService);
        encounter.encounterType = encounterType;
        encounter.individual = individual;
        return encounter;
    }

    get toResource() {
        const resource = _.pick(this, ["uuid"]);
        resource["encounterTypeUUID"] = this.encounterType.uuid;
        resource["individualUUID"] = this.individual.uuid;
        resource.encounterDateTime = moment(this.encounterDateTime).format();
        resource["observations"] = [];
        this.observations.forEach((obs) => {
            resource["observations"].push(obs.toResource);
        });
        return resource;
    }

    cloneForEdit() {
        const encounter = new Encounter();
        encounter.uuid = this.uuid;
        encounter.encounterType = _.isNil(this.encounterType) ? null : this.encounterType.clone();
        encounter.encounterDateTime = this.encounterDateTime;
        encounter.individual = this.individual; //in encounter edit individual is not changed
        encounter.observations = ObservationsHolder.clone(this.observations);
        return encounter;
    }

    static validationKeys = {
        ENCOUNTER_DATE_TIME: 'ENCOUNTER_DATE_TIME',
        EXTERNAL_RULE: 'EXTERNAL_RULE'
    };

    validate() {
        return _.isNil(this.encounterDateTime) ?
            [new ValidationResult(false, Encounter.validationKeys.ENCOUNTER_DATE_TIME, "emptyValidationMessage")] : [ValidationResult.successful(Encounter.validationKeys.ENCOUNTER_DATE_TIME)];
    }
}

export default Encounter;