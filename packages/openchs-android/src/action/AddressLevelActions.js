import EntityService from "../service/EntityService";
import {AddressLevel} from "openchs-models";

class AddressLevelActions {
    static getInitialState(context) {
        return context.get(EntityService).getAll(AddressLevel.schema.name);
    }
}

export {
    AddressLevelActions
};