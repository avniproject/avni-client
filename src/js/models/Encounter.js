import Individual from "./Individual";
import ResourceUtil from "../utility/ResourceUtil";
import AbstractEncounter from "./AbstractEncounter";

class Encounter extends AbstractEncounter {
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
        const encounter = AbstractEncounter.fromResource(resource, entityService, new Encounter());

        encounter.individual = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(resource, "individualUUID"), Individual.schema.name);
        return encounter;
    }

    get toResource() {
        const resource = super.toResource;
        resource["individualUUID"] = this.individual.uuid;
        return resource;
    }

    cloneForEdit() {
        const encounter = super.cloneForEdit(new Encounter());
        encounter.individual = this.individual;
        return encounter;
    }
}

export default Encounter;