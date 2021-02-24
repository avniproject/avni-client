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

    getDashboardsBasedOnPrivilege() {
        return this.getService(PrivilegeService).hasAllPrivileges() ?
            this.getAllDashboards() : this.getDashboardsFromGroupDashboard();
    }

    getDashboardsFromGroupDashboard() {
        const ownedGroupsQuery = _.map(this.getService(PrivilegeService).ownedGroups(), ({groupUuid}) => `group.uuid = '${groupUuid}'`).join(' OR ');
        const groupDashboards = this.getService(EntityService).getAllNonVoided(GroupDashboard.schema.name)
            .filtered(_.isEmpty(ownedGroupsQuery) ? 'uuid = null' : ownedGroupsQuery)
            .filtered('TRUEPREDICATE DISTINCT(dashboard.uuid)');
        return _.map(groupDashboards, ({dashboard}) => dashboard);
    }

}

export default CustomDashboardService
