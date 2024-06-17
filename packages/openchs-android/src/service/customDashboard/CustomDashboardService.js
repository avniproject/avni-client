import BaseService from "../BaseService";
import Service from "../../framework/bean/Service";
import {Dashboard, GroupDashboard} from "avni-models";
import PrivilegeService from "../PrivilegeService";
import EntityService from "../EntityService";
import _ from 'lodash';
import CustomDashboardCacheService from "../CustomDashboardCacheService";
import {AddressLevel, Concept, CustomFilter, Gender, Individual} from "openchs-models";
import DashboardFilterService from "../reports/DashboardFilterService";

function getOneDashboard(dashboards) {
    return _.head(_.map(dashboards, ({dashboard}) => dashboard));
}

export const CustomDashboardType = {
    Primary: "Primary",
    Secondary: "Secondary",
    None: "None"
}

const dataTypeDetails = new Map();
dataTypeDetails.set(Concept.dataType.Coded, {type: Concept, isArray: true});
dataTypeDetails.set(CustomFilter.type.Gender, {type: Gender, isArray: true});
dataTypeDetails.set(CustomFilter.type.Address, {type: AddressLevel, isArray: true});
dataTypeDetails.set(CustomFilter.type.GroupSubject, {type: Individual, isArray: false});

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
        switch (customDashboardType) {
            case CustomDashboardType.Primary:
                return [this.getOnePrimaryDashboard()];
            case CustomDashboardType.Secondary:
                return [this.getOneSecondaryDashboard()];
            case CustomDashboardType.None:
            default:
                return this.getDashboardsBasedOnPrivilege();
        }
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

    getDashboardData(dashboardUUID) {
        const {selectedFilterValues, dashboardCache} = this.getService(CustomDashboardCacheService).getDashboardCache(dashboardUUID, dataTypeDetails);
        const customDashboardService = this.getService(DashboardFilterService);
        dashboardCache.dashboard.filters.filter(filter => _.isNil(selectedFilterValues[filter.uuid])).forEach(filter => {
            const dashboardFilterConfig = customDashboardService.getDashboardFilterConfig(filter);
            const dataType = dataTypeDetails.get(dashboardFilterConfig.type);
            selectedFilterValues[filter.uuid] = _.get(dataType, "isArray") ? [] : null;
        });
        return {selectedFilterValues, dashboardCache};
    }

    setSelectedFilterValues(dashboardUUID, selectedFilterValues, filterApplied) {
        const customDashboardCacheService = this.getService(CustomDashboardCacheService);
        customDashboardCacheService.setSelectedFilterValues(dashboardUUID, selectedFilterValues, filterApplied, dataTypeDetails);
    }
}

export default CustomDashboardService
