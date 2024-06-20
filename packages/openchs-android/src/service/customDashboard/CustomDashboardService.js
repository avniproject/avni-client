import BaseService from "../BaseService";
import Service from "../../framework/bean/Service";
import {Dashboard, DashboardFilterConfig, GroupDashboard, Range} from "openchs-models";
import PrivilegeService from "../PrivilegeService";
import EntityService from "../EntityService";
import _ from 'lodash';
import CustomDashboardCacheService from "../CustomDashboardCacheService";
import DashboardFilterService from "../reports/DashboardFilterService";
import FormMetaDataSelection from "../../model/FormMetaDataSelection";
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
        const {selectedFilterValues, dashboardCache} = this.getService(CustomDashboardCacheService).getDashboardCache(dashboardUUID);
        const customDashboardService = this.getService(DashboardFilterService);
        dashboardCache.dashboard.filters.filter(filter => !filter.voided && _.isNil(selectedFilterValues[filter.uuid])).forEach(filter => {
            const dashboardFilterConfig = customDashboardService.getDashboardFilterConfig(filter);
            const inputDataType = dashboardFilterConfig.getInputDataType();

            General.logDebugTemp("CustomDashboardCacheService", "Init empty values for", dashboardFilterConfig.toDisplayText());

            if (dashboardFilterConfig.isMultiEntityType()) {
                selectedFilterValues[filter.uuid] = [];
            } else if (dashboardFilterConfig.isDateRangeFilterType() || dashboardFilterConfig.isDateTimeRangeFilterType() || dashboardFilterConfig.isTimeRangeFilterType() || dashboardFilterConfig.isNumericRangeFilterType()) {
                //value should not be an array but CustomFilterService and MyDashboard has been built on that assumption
                selectedFilterValues[filter.uuid] = Range.empty();
            } else if (inputDataType === DashboardFilterConfig.dataTypes.formMetaData) {
                selectedFilterValues[filter.uuid] = FormMetaDataSelection.createNew();
            } else {
                selectedFilterValues[filter.uuid] = null;
            }
        });
        return {selectedFilterValues, dashboardCache};
    }

    setSelectedFilterValues(dashboardUUID, selectedFilterValues, filterApplied) {
        const customDashboardCacheService = this.getService(CustomDashboardCacheService);
        customDashboardCacheService.setSelectedFilterValues(dashboardUUID, selectedFilterValues, filterApplied);
        return this.getDashboardData(dashboardUUID);
    }
}

export default CustomDashboardService
