import BaseService from "../BaseService";
import Service from "../../framework/bean/Service";
import {Dashboard, GroupDashboard} from "avni-models";
import PrivilegeService from "../PrivilegeService";
import EntityService from "../EntityService";
import _ from 'lodash';
import General from "../../utility/General";

function getOneDashboard(dashboards) {
    return _.head(_.map(dashboards, ({dashboard}) => dashboard));
}

export const CustomDashboardType = {
    Primary: "Primary",
    Secondary: "Secondary",
    None: "None"
}

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

    getDashboards(customDashboardType) {
        General.logDebugTemp("CustomDashboardService", customDashboardType);
        switch (customDashboardType) {
            case CustomDashboardType.Primary:
                return [this.getOnePrimaryDashboard()];
            case CustomDashboardType.Secondary:
                return [this.getOneSecondaryDashboard()];
            case CustomDashboardType.None:
                return this.getDashboardsBasedOnPrivilege();
        }
        return this.getDashboardsBasedOnPrivilege();
    }

    getOnePrimaryDashboard() {
        const groupDashboards = this.getGroupDashboards().filtered('primaryDashboard = true');
        return getOneDashboard(groupDashboards);
    }

    getOneSecondaryDashboard() {
        const groupDashboards = this.getGroupDashboards().filtered('secondaryDashboard = true');
        return getOneDashboard(groupDashboards);
    }

    isCustomDashboardMarkedPrimary() {
        return this.getGroupDashboards().filtered('primaryDashboard = true').length > 0;
    }

    getDashboardsBasedOnPrivilege() {
        return this.getService(PrivilegeService).hasAllPrivileges() ?
            this.getAllDashboards() : _.map(this.getGroupDashboards(), ({dashboard}) => dashboard);
    }

    getGroupDashboards() {
        const ownedGroupsQuery = _.map(this.getService(PrivilegeService).ownedGroups(), ({groupUuid}) => `group.uuid = '${groupUuid}'`).join(' OR ');
        return this.getService(EntityService).getAllNonVoided(GroupDashboard.schema.name)
            .filtered(_.isEmpty(ownedGroupsQuery) ? 'uuid = null' : ownedGroupsQuery)
            .filtered('TRUEPREDICATE DISTINCT(dashboard.uuid)');
    }
}

export default CustomDashboardService
