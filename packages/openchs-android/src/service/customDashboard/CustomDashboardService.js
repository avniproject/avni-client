import BaseService from "../BaseService";
import Service from "../../framework/bean/Service";
import {CustomFilter, Dashboard, DashboardFilterConfig, GroupDashboard, Range} from "openchs-models";
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
        .filtered('TRUEPREDICATE DISTINCT(dashboard.uuid)')
        .filtered('dashboard.voided = false');
}

function getDashboardsBasedOnPrivilege(privilegeService, entityService, customDashboardService) {
    return privilegeService.hasAllPrivileges() ?
        customDashboardService.getAllDashboards() : _.map(getGroupDashboards(privilegeService, entityService), ({dashboard}) => dashboard);
}

// A setting missing on one filter and null on the other counts as the same, because nil equals nil.
function sameSetting(source, target) {
    return _.isNil(source) ? _.isNil(target) : source === target;
}

function usesSubjectType(type) {
    const filterConfig = new DashboardFilterConfig();
    filterConfig.type = type;
    return filterConfig.requiresSpecificSubjectType();
}

// What has to agree, besides the type, for two filters of this type to be the same filter.
// A Subject Type filter needs nothing more. Programs and encounter types of a Concept filter are not compared.
function settingsToCompare(type) {
    if (type === CustomFilter.type.SubjectType) return [];
    const paths = ["widget", "groupSubjectTypeFilter.subjectTypeUUID"];
    if (usesSubjectType(type)) paths.push("subjectTypeUUID");
    if (type === CustomFilter.type.Concept) paths.push("observationBasedFilter.conceptUUID", "observationBasedFilter.scope");
    return paths;
}

// Takes the parsed DashboardFilter.filterConfig of two filters and compares the uuids stored in them, not the entities
// looked up from those uuids. A subject type this phone lacks looks up as nothing, and nothing would match nothing.
export function filterSettingsMatch(sourceSettings, targetSettings) {
    const type = _.get(sourceSettings, "type");
    return sameSetting(type, _.get(targetSettings, "type"))
        && settingsToCompare(type).every(path => sameSetting(_.get(sourceSettings, path), _.get(targetSettings, path)));
}

// A value is chosen unless it is nil, an empty array or string, or says it is empty itself (Range, FormMetaDataSelection, AddressFilterValue).
// The cache saves none of those, so carrying one would only wipe what the target had saved.
// Not _.isEmpty on every value: lodash calls a Date empty.
export function isChosenFilterValue(value) {
    if (_.isNil(value) || value === "") return false;
    if (_.isArray(value)) return !_.isEmpty(value);
    return !(_.isFunction(value.isEmpty) && value.isEmpty());
}

// The filters of one dashboard, each with the settings stored in its filterConfig parsed. Unlike
// DashboardFilterService.getFilterConfigsForDashboard, it looks no entities up from them.
function readFilters(dashboardFilters) {
    return _.map(dashboardFilters, ({uuid, name, filterConfig}) => ({uuid, name, settings: JSON.parse(filterConfig)}));
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
        const dashboardFilterService = this.getService(DashboardFilterService);
        dashboardCache.dashboard.filters.filter(filter => !filter.voided && _.isNil(selectedFilterValues[filter.uuid])).forEach(filter => {
            const dashboardFilterConfig = dashboardFilterService.getDashboardFilterConfig(filter);
            const inputDataType = dashboardFilterConfig.getInputDataType();

            General.logDebug("CustomDashboardCacheService", "Init empty values for", dashboardFilterConfig.toDisplayText());

            if (dashboardFilterConfig.isMultiEntityType()) {
                selectedFilterValues[filter.uuid] = [];
            } else if (dashboardFilterConfig.isDateLikeRangeFilterType() || dashboardFilterConfig.isNumericRangeFilterType()) {
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

    // Starts the filters of the dashboard a tile opens with the values the user chose on the dashboard they came from.
    // A target filter takes the value of the first source filter, in order of name then uuid, that has the same settings and a chosen value.
    // `overrides` maps a target filter uuid to a value and is applied last.
    // Writes the target's saved values, and returns true, only when something was carried or overridden.
    carryFiltersOver(sourceDashboardUUID, targetDashboardUUID, overrides = {}) {
        const dashboardFilterService = this.getService(DashboardFilterService);
        const sourceFilters = _.sortBy(readFilters(dashboardFilterService.getFilters(sourceDashboardUUID)), ["name", "uuid"]);
        const targetFilters = readFilters(dashboardFilterService.getFilters(targetDashboardUUID));
        const sourceValues = this.getDashboardData(sourceDashboardUUID).selectedFilterValues;
        const values = {...this.getDashboardData(targetDashboardUUID).selectedFilterValues};
        let changed = false;

        targetFilters.forEach(targetFilter => {
            const sourceFilter = sourceFilters.find(({uuid, settings}) =>
                filterSettingsMatch(settings, targetFilter.settings) && isChosenFilterValue(sourceValues[uuid]));
            if (sourceFilter) {
                // TODO(avniproject/avni-client#2222): keep the target's Subject Type preset when the carried selection disagrees
                values[targetFilter.uuid] = sourceValues[sourceFilter.uuid];
                changed = true;
            }
        });
        _.forOwn(overrides, (value, filterUUID) => {
            values[filterUUID] = value;
            changed = true;
        });

        if (!changed) return false;
        this.setSelectedFilterValues(targetDashboardUUID, values, true);
        return true;
    }
}

export default CustomDashboardService
