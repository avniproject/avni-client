import _ from "lodash";
import ValidationResult from "./application/ValidationResult";
import BaseEntity from "./BaseEntity";
import EncounterType from "./EncounterType";
import ObservationsHolder from "./ObservationsHolder";
import General from "../utility/General";
import ResourceUtil from "../utility/ResourceUtil";
import moment from "moment";

class AbstractEncounter extends BaseEntity {
    static fieldKeys = {
        ENCOUNTER_DATE_TIME: 'ENCOUNTER_DATE_TIME',
        EXTERNAL_RULE: 'EXTERNAL_RULE'
    };

    validate() {
        return _.isNil(this.encounterDateTime) ?
            [new ValidationResult(false, AbstractEncounter.fieldKeys.ENCOUNTER_DATE_TIME, "emptyValidationMessage")] : [ValidationResult.successful(AbstractEncounter.fieldKeys.ENCOUNTER_DATE_TIME)];
    }

    get toResource() {
        const resource = _.pick(this, ["uuid"]);
        resource["encounterTypeUUID"] = this.encounterType.uuid;
        resource.encounterDateTime = moment(this.encounterDateTime).format();
        resource["observations"] = [];
        this.observations.forEach((obs) => {
            resource["observations"].push(obs.toResource);
        });
        return resource;
    }

    cloneForEdit(encounter) {
        encounter.uuid = this.uuid;
        encounter.encounterType = _.isNil(this.encounterType) ? null : this.encounterType.clone();
        encounter.encounterDateTime = this.encounterDateTime;
        encounter.observations = ObservationsHolder.clone(this.observations);
        return encounter;
    }

    static fromResource(resource, entityService, encounter) {
        const programEncounter = General.assignFields(resource, encounter, ["uuid"], ["encounterDateTime"], ["observations"], entityService);
        programEncounter.encounterType = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(resource, "encounterTypeUUID"), EncounterType.schema.name);
        return encounter;
    }

    getEncounterDateValues() {
        const dateValues = {};
        dateValues[AbstractEncounter.fieldKeys.ENCOUNTER_DATE_TIME] = this.encounterDateTime;
        return dateValues;
    }
}

export default AbstractEncounter;