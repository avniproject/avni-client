import EntityService from "../service/EntityService";
import {AddressLevel} from "openchs-models";
import UserInfoService from "../service/UserInfoService";

class AddressLevelActions {
    static getInitialState(context) {
        const addressLevels = context.get(EntityService).getAll(AddressLevel.schema.name);
        const catchmentType = context.get(UserInfoService).getUserInfo().catchmentType;
        return {addressLevels: addressLevels, catchmentType: catchmentType};
    }
}

export {
    AddressLevelActions
};