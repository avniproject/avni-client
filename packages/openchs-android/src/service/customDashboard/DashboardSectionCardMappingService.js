import BaseService from "../BaseService";
import Service from "../../framework/bean/Service";
import {DashboardSectionCardMapping} from "avni-models";

@Service("dashboardSectionCardMappingService")
class DashboardSectionCardMappingService extends BaseService {

    constructor(db, context) {
        super(db, context);
    }

    getSchema() {
        return DashboardSectionCardMapping.schema.name;
    }

    getAllCardsForDashboard(dashboardUUID) {
        return this.getAll()
            .filtered('voided = false and dashboardSection.dashboard.uuid = $0', dashboardUUID)
            .sorted('displayOrder')
    }

}

export default DashboardSectionCardMappingService
