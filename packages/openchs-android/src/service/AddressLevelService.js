import Service from '../framework/bean/Service';
import {AddressLevel} from 'openchs-models';
import BaseAddressLevelService from "./BaseAddressLevelService";

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
            .filtered('voided = false and parentUuid == null').map(_.identity);
        const sortedAddresses = _.orderBy(selectedAddresses, 'level', 'desc');
        const thisService = this;
        sortedAddresses.forEach(selectedAddress => {
            allDisplayAddresses = allDisplayAddresses.concat(thisService.getChildren(selectedAddress.uuid));
        });
        return allDisplayAddresses;
    }
}

export default AddressLevelService;
