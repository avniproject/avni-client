import BaseService from "../BaseService";
import Service from "../../framework/bean/Service";
import {DashboardCardMapping} from "avni-models";

@Service("dashboardCardMappingService")
class DashboardCardMappingService extends BaseService {

    constructor(db, context) {
        super(db, context);
    }

    getSchema() {
        return DashboardCardMapping.schema.name;
    }

    getAllCardsForDashboard(dashboardUUID) {
        return this.getAll()
            .filtered('voided = false and dashboard.uuid = $0', dashboardUUID)
            .sorted('displayOrder', true)
            .map(({card}) => card)
    }

}
