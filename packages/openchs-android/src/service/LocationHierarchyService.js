import Service from '../framework/bean/Service';
import {LocationHierarchy} from 'avni-models';
import BaseAddressLevelService from "./BaseAddressLevelService";

@Service("locationHierarchyService")
class LocationHierarchyService extends BaseAddressLevelService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    getAllRootParents() {
        return this.findAll(this.getSchema())
            .filtered('voided = false and parentUuid = null');
    }

    getSchema() {
        return LocationHierarchy.schema.name;
    }
}

export default LocationHierarchyService;
