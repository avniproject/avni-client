import RealmRepository from './RealmRepository';
import {AddressLevel} from 'openchs-models';

class AddressLevelRepository extends RealmRepository {
    constructor(db) {
        super(db, AddressLevel.schema.name);
    }

    findByParent(parentUUID) {
        return this.findAll().filtered('parentUuid = $0', parentUUID);
    }

    findByType(typeUUID) {
        return this.findAll().filtered('typeUuid = $0', typeUUID);
    }
}

export default AddressLevelRepository;
