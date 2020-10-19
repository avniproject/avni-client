import Service from '../framework/bean/Service';
import {AddressLevel} from 'avni-models';
import BaseAddressLevelService from "./BaseAddressLevelService";

@Service("addressLevelService")
class AddressLevelService extends BaseAddressLevelService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    getSchema() {
        return AddressLevel.schema.name;
    }
}

export default AddressLevelService;
