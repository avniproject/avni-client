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

export const CustomDashboardType = {
    Primary: "Primary",
    Secondary: "Secondary",
    None: "None"
}

function getOneDashboard(dashboards) {
    return _.head(_.map(dashboards, ({dashboard}) => dashboard));
}

function getOnePrimaryDashboard(privilegeService, entityService) {
    const groupDashboards = getGroupDashboards(privilegeService, entityService).filtered('primaryDashboard = true');
    return getOneDashboard(groupDashboards);
}

function getGroupDashboards(privilegeService, entityService) {
    const ownedGroupsQuery = _.map(privilegeService.ownedGroups(), ({groupUuid}) => `group.uuid = '${groupUuid}'`).join(' OR ');
    return entityService.getAllNonVoided(GroupDashboard.schema.name)
        .filtered(_.isEmpty(ownedGroupsQuery) ? 'uuid = null' : ownedGroupsQuery)
        .filtered('TRUEPREDICATE DISTINCT(dashboard.uuid)');
}

function getDashboardsBasedOnPrivilege(privilegeService, entityService, customDashboardService) {
    return privilegeService.hasAllPrivileges() ?
        customDashboardService.getAllDashboards() : _.map(getGroupDashboards(privilegeService, entityService), ({dashboard}) => dashboard);
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
        const privilegeService = this.getService(PrivilegeService);
        const entityService = this.getService(EntityService);
        switch (customDashboardType) {
            case CustomDashboardType.Primary:
                return [getOnePrimaryDashboard(privilegeService, entityService)];
            case CustomDashboardType.Secondary:
                return [this.getOneSecondaryDashboard(privilegeService, entityService)];
            case CustomDashboardType.None:
            default:
                return getDashboardsBasedOnPrivilege(privilegeService, entityService, this);
        }
    }

    isCustomDashboardMarkedPrimary() {
        return getGroupDashboards(this.getService(PrivilegeService), this.getService(EntityService)).filtered('primaryDashboard = true').length > 0;
    }

    getDashboardData(dashboardUUID) {
        const {selectedFilterValues, dashboardCache} = this.getService(CustomDashboardCacheService).getDashboardCache(dashboardUUID);
        const customDashboardService = this.getService(DashboardFilterService);
        dashboardCache.dashboard.filters.filter(filter => !filter.voided && _.isNil(selectedFilterValues[filter.uuid])).forEach(filter => {
            const dashboardFilterConfig = customDashboardService.getDashboardFilterConfig(filter);
            const inputDataType = dashboardFilterConfig.getInputDataType();

            General.logDebug("CustomDashboardCacheService", "Init empty values for", dashboardFilterConfig.toDisplayText());

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

    getOneSecondaryDashboard() {
        const groupDashboards = getGroupDashboards(this.getService(PrivilegeService), this.getService(EntityService)).filtered('secondaryDashboard = true');
        return getOneDashboard(groupDashboards);
    }

    setSelectedFilterValues(dashboardUUID, selectedFilterValues, filterApplied) {
        const customDashboardCacheService = this.getService(CustomDashboardCacheService);
        customDashboardCacheService.setSelectedFilterValues(dashboardUUID, selectedFilterValues, filterApplied);
        return this.getDashboardData(dashboardUUID);
    }
}

export default CustomDashboardService
