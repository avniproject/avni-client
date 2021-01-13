import BaseService from "../BaseService";
import Service from "../../framework/bean/Service";
import {Dashboard} from "avni-models";

@Service("customDashboardService")
class CustomDashboardService extends BaseService {

    constructor(db, context) {
        super(db, context);
    }

    getSchema() {
        return Dashboard.schema.name;
    }

    getAllDashboards() {
        return [...this.getAll().filtered('voided = false')];
    }

}

export default CustomDashboardService
