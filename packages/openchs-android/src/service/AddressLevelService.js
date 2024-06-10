import Service from '../framework/bean/Service';
import {AddressLevel} from 'openchs-models';
import BaseAddressLevelService from "./BaseAddressLevelService";
import _ from "lodash";

@Service("addressLevelService")
class AddressLevelService extends BaseAddressLevelService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    getSchema() {
        return AddressLevel.schema.name;
    }

    getAllDescendants(addresses) {
        const addressLevelService = this;
        return addresses
            .filter(location => location.level === _.get(_.minBy(addresses, 'level'), 'level'))
            .reduce((acc, parent) => acc.concat(addressLevelService.getDescendantsOfNode(parent)), []);
    }
}

export default AddressLevelService;
