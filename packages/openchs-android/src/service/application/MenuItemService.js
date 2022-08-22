import _ from "lodash";
import Service from "../../framework/bean/Service";
import BaseService from "../BaseService";
import {MenuItem} from "openchs-models";

@Service("menuItemService")
class MenuItemService extends BaseService {
    constructor(db, context) {
        super(db, context);
    }

    getSchema() {
        return MenuItem.schema.name;
    }

    getAllMenuItems() {
        return this.getAllNonVoided().map(_.identity);
    }
}

export default MenuItemService;
