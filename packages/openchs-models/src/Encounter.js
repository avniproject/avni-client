import Individual from "./Individual";
import ResourceUtil from "./utility/ResourceUtil";
import AbstractEncounter from "./AbstractEncounter";
import _ from "lodash";
import ValidationResult from "./application/ValidationResult";
import G from "./utility/General";
import moment from "moment";
import EncounterType from "./EncounterType";
import {findMediaObservations} from "./Media";
import ObservationsHolder from "./ObservationsHolder";
import Point from "./geo/Point";

class Encounter extends AbstractEncounter {
    static schema = {
        name: 'Encounter',
        primaryKey: 'uuid',
        properties: {
            uuid: 'string',
            encounterType: 'EncounterType',
            encounterDateTime: 'date',
            individual: 'Individual',
            observations: {type: 'list', objectType: 'Observation'},
            encounterLocation: {type: 'Point', optional: true},
            voided: {type: 'bool', default: false}
        }
    };

    static validationKeys = {
        ENCOUNTER_LOCATION: 'ENCOUNTER_LOCATION',
    };

    static create() {
        let encounter = AbstractEncounter.createEmptyInstance(new Encounter());
        encounter.observations = [];
        encounter.uuid = G.randomUUID();
        encounter.encounterDateTime = new Date();
        encounter.encounterType = EncounterType.create();
        return encounter;
    }

    static fromResource(resource, entityService) {
        const encounter = AbstractEncounter.fromResource(resource, entityService, new Encounter());

        encounter.individual = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(resource, "individualUUID"), Individual.schema.name);

        if(!_.isNil(resource.encounterLocation))
            encounter.encounterLocation = Point.fromResource(resource.encounterLocation);

        return encounter;
    }

    get toResource() {
        const resource = super.toResource;
        resource.encounterDateTime = moment(this.encounterDateTime).format();
        resource["individualUUID"] = this.individual.uuid;
        if(!_.isNil(this.encounterLocation)) {
            resource["encounterLocation"] = this.encounterLocation.toResource;
        }
        return resource;
    }

    cloneForEdit() {
        const encounter = super.cloneForEdit(new Encounter());
        encounter.individual = this.individual;
        encounter.encounterLocation = _.isNil(this.encounterLocation) ? null : this.encounterLocation.clone();
        return encounter;
    }

    validate() {
        const validationResults = super.validate();
        if (!_.isNil(this.encounterDateTime) && G.dateAIsBeforeB(this.encounterDateTime, this.individual.registrationDate))
            validationResults.push(new ValidationResult(false, AbstractEncounter.fieldKeys.ENCOUNTER_DATE_TIME, 'encounterDateBeforeRegistrationDate'));
        return validationResults;
    }

    getName() {
        return 'Encounter';
    }

    findMediaObservations() {
        return findMediaObservations(this.observations);
    }

    replaceObservation(originalValue, newValue) {
        new ObservationsHolder(this.observations).updateObservationBasedOnValue(originalValue, newValue);
    }
}

export default Encounter;
