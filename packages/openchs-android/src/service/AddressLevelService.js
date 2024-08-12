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

    getAllDisplayAddresses(selectedAddresses) {
        let allDisplayAddresses = this.findAll(this.getSchema())
            .filtered('voided = false and typeUuid == $0', this.maxTypeUUID()).map(_.identity);
        const sortedAddresses = _.orderBy(selectedAddresses, 'level', 'desc');
        const thisService = this;
        sortedAddresses.forEach(selectedAddress => {
            allDisplayAddresses = allDisplayAddresses.concat(thisService.getChildren(selectedAddress.uuid));
        });
        return allDisplayAddresses;
    }

    getAllDescendants(addresses) {
        const addressLevelService = this;
        return addresses
            .filter(location => location.level === _.get(_.minBy(addresses, 'level'), 'level'))
            .reduce((acc, parent) => acc.concat(addressLevelService.getDescendantsOfNode(parent)), []);
    }
}

export default AddressLevelService;
