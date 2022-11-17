import AddressLevelService from "../AddressLevelService";
import GlobalContext from "../../GlobalContext";

class AddressLevelServiceFacade {
    constructor() {}

    findAddressLevelByUUID(uuid) {
        return GlobalContext.getInstance().beanRegistry.getService(AddressLevelService)
            .findByUUID(uuid);
    }

}

const addressLevelServiceFacade = new AddressLevelServiceFacade();
export default addressLevelServiceFacade;
