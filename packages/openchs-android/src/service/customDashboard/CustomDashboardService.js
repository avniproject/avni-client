import BaseService from "../BaseService";
import Service from "../../framework/bean/Service";
import {Dashboard, GroupDashboard} from "avni-models";
import PrivilegeService from "../PrivilegeService";
import EntityService from "../EntityService";
import _ from 'lodash';

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

    getDashboards(onlyPrimary) {
        return onlyPrimary ? [this.getOnePrimaryDashboard()] : this.getDashboardsBasedOnPrivilege();
    }

    getOnePrimaryDashboard() {
        const groupDashboards = this.getGroupDashboard().filtered('primaryDashboard = true');
        return _.head(_.map(groupDashboards, ({dashboard}) => dashboard));
    }

    isCustomDashboardMarkedPrimary() {
        return this.getGroupDashboard().filtered('primaryDashboard = true').length > 0;
    }

    getDashboardsBasedOnPrivilege() {
        return this.getService(PrivilegeService).hasAllPrivileges() ?
            this.getAllDashboards() : _.map(this.getGroupDashboard(), ({dashboard}) => dashboard);
    }

    getGroupDashboard() {
        const ownedGroupsQuery = _.map(this.getService(PrivilegeService).ownedGroups(), ({groupUuid}) => `group.uuid = '${groupUuid}'`).join(' OR ');
        return this.getService(EntityService).getAllNonVoided(GroupDashboard.schema.name)
            .filtered(_.isEmpty(ownedGroupsQuery) ? 'uuid = null' : ownedGroupsQuery)
            .filtered('TRUEPREDICATE DISTINCT(dashboard.uuid)');
    }

}

export default CustomDashboardService
