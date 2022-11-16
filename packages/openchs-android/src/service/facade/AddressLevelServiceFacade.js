import BeanRegistry from "../../framework/bean/BeanRegistry";
import AddressLevelService from "../AddressLevelService";

class AddressLevelServiceFacade {
    constructor() {}

    findAddressLevelByUUID(uuid) {
        return BeanRegistry.getService(AddressLevelService)
            .findByUUID(uuid);
    }

}

const addressLevelServiceFacade = new AddressLevelServiceFacade();
export default addressLevelServiceFacade;
