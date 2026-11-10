import BaseService from "../BaseService";
import Service from "../../framework/bean/Service";
import {CustomFilter, Dashboard, DashboardFilterConfig, GroupDashboard, Program, Range} from "openchs-models";
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

// Shared by a tile and a Custom Design Card's page: can this user see that dashboard. A nil uuid is checked on its own, so it can never match a dashboard.
export function isDashboardAvailableToUser(customDashboardService, dashboardUUID) {
    return !_.isNil(dashboardUUID)
        && _.some(customDashboardService.getDashboards(CustomDashboardType.None), dashboard => _.get(dashboard, 'uuid') === dashboardUUID);
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
// The cache saves none of those. An unset value is still carried when the target's matching filter has a chosen value: writing it
// leaves that filter out of what is saved, which clears it. A target with a Subject Type preset returns to its preset instead.
// Not _.isEmpty on every value: lodash calls a Date empty.
export function isChosenFilterValue(value) {
    if (_.isNil(value) || value === "") return false;
    if (_.isArray(value)) return !_.isEmpty(value);
    return !(_.isFunction(value.isEmpty) && value.isEmpty());
}

// The filters of one dashboard, each with the settings stored in its filterConfig parsed. Unlike
// DashboardFilterService.getFilterConfigsForDashboard, it looks no entities up from them.
// `row` is the row itself, for DashboardFilterService.getDashboardFilterConfig.
function readFilters(dashboardFilters) {
    return _.map(dashboardFilters, (row) => ({uuid: row.uuid, name: row.name, settings: JSON.parse(row.filterConfig), row}));
}

// A selection that holds a preset part that no longer counts is not kept, and is not carried. A preset subject type that is deleted or
// missing on the phone no longer counts. With the preset subject type in place, the preset program no longer counts once it is deleted or
// missing on the phone, or the subject type no longer enrols into it (`presetProgram` is then null). Without the preset subject type,
// only once the program itself is deleted or missing, because the user may then pick it under another subject type.
// `settings` is the filter's parsed filterConfig. The program is looked up only when the selection holds it.
function holdsGonePresetPart(dashboardFilterService, selection, settings, presetSubjectType, presetProgram) {
    const holds = (list, uuid) => !_.isEmpty(uuid) && _.some(list, x => x.uuid === uuid);
    if (!presetSubjectType && holds(selection.subjectTypes, settings.presetSubjectTypeUUID)) return true;
    if (!holds(selection.programs, settings.presetProgramUUID)) return false;
    return presetSubjectType
        ? !presetProgram
        : !dashboardFilterService.findLivePreset(settings.presetProgramUUID, Program.schema.name);
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
        // A Subject Type filter's preset is its default: a saved value that disagrees with it is replaced by it. So is one that holds
        // a preset part that no longer counts (see holdsGonePresetPart). Only a saved selection on a Subject Type filter with a preset
        // needs its settings looked up, so the raw settings decide that first.
        dashboardCache.dashboard.filters.filter(filter => !filter.voided && selectedFilterValues[filter.uuid] instanceof FormMetaDataSelection).forEach(filter => {
            const raw = JSON.parse(filter.filterConfig);
            if (raw.type !== CustomFilter.type.SubjectType || !raw.presetSubjectTypeUUID) return;
            const {presetSubjectType, presetProgram} = dashboardFilterService.getDashboardFilterConfig(filter);
            const saved = selectedFilterValues[filter.uuid];
            if (holdsGonePresetPart(dashboardFilterService, saved, raw, presetSubjectType, presetProgram)
                || (presetSubjectType && !saved.agreesWithPreset(presetSubjectType, presetProgram))) {
                selectedFilterValues[filter.uuid] = FormMetaDataSelection.forPreset(presetSubjectType, presetProgram);
            }
        });
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
                selectedFilterValues[filter.uuid] = FormMetaDataSelection.forPreset(dashboardFilterConfig.presetSubjectType, dashboardFilterConfig.presetProgram);
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

    // Starts the filters of the dashboard a tile opens with the values they have on the dashboard the user came from, an unset one included.
    // A target filter takes the value of the first source filter, in order of name then uuid, that has the same settings and a chosen value,
    // else of the first one with the same settings. So an unset value is carried too, and clears the target's own unless both are unset.
    // `overrides` maps a target filter uuid to a value and is applied last.
    // Writes the target's saved values, and returns true, only when something was carried or overridden.
    // A target Subject Type filter with a preset takes the carried value only when it agrees with the preset and holds no preset part that
    // no longer counts, else the preset, and nothing is written when that is already its value. When the preset subject type itself is gone,
    // a carried value that holds a part that no longer counts is carried as no selection. Nothing is written either when a Subject Type value is unchanged, whatever the preset.
    carryFiltersOver(sourceDashboardUUID, targetDashboardUUID, overrides = {}) {
        const dashboardFilterService = this.getService(DashboardFilterService);
        const sourceFilters = _.sortBy(readFilters(dashboardFilterService.getFilters(sourceDashboardUUID)), ["name", "uuid"]);
        const targetFilters = readFilters(dashboardFilterService.getFilters(targetDashboardUUID));
        const sourceValues = this.getDashboardData(sourceDashboardUUID).selectedFilterValues;
        const values = {...this.getDashboardData(targetDashboardUUID).selectedFilterValues};
        let changed = false;

        targetFilters.forEach(targetFilter => {
            const matching = sourceFilters.filter(({settings}) => filterSettingsMatch(settings, targetFilter.settings));
            if (_.isEmpty(matching)) return;
            const sourceFilter = matching.find(({uuid}) => isChosenFilterValue(sourceValues[uuid])) || matching[0];
            let carried = sourceValues[sourceFilter.uuid];
            // A target Subject Type filter with a preset keeps it. The value written is the carried one when it is chosen and agrees with
            // the preset and holds no preset part that no longer counts (see holdsGonePresetPart), else the preset itself, and nothing
            // when that is what the target already holds. A target with a preset subject type that is in place always holds a selection,
            // never an empty one, so the unset-on-both-sides check below cannot decide for it.
            if (targetFilter.settings.presetSubjectTypeUUID) {
                const {presetSubjectType, presetProgram} = dashboardFilterService.getDashboardFilterConfig(targetFilter.row);
                if (presetSubjectType) {
                    const value = isChosenFilterValue(carried) && carried instanceof FormMetaDataSelection && carried.agreesWithPreset(presetSubjectType, presetProgram)
                        && !holdsGonePresetPart(dashboardFilterService, carried, targetFilter.settings, presetSubjectType, presetProgram)
                        ? carried
                        : FormMetaDataSelection.forPreset(presetSubjectType, presetProgram);
                    const current = values[targetFilter.uuid];
                    if (current instanceof FormMetaDataSelection && current.sameAs(value)) return;
                    values[targetFilter.uuid] = value;
                    changed = true;
                    return;
                }
                if (carried instanceof FormMetaDataSelection && holdsGonePresetPart(dashboardFilterService, carried, targetFilter.settings, presetSubjectType, presetProgram)) {
                    carried = FormMetaDataSelection.createNew();
                }
            }
            const current = values[targetFilter.uuid];
            if (!isChosenFilterValue(carried) && !isChosenFilterValue(current)) return;
            // The same Subject Type value again, as a preset source gives on every open, is not a change.
            if (carried instanceof FormMetaDataSelection && current instanceof FormMetaDataSelection && current.sameAs(carried)) return;
            values[targetFilter.uuid] = carried;
            changed = true;
        });
        _.forOwn(overrides, (value, filterUUID) => {
            values[filterUUID] = value;
            changed = true;
        });

        if (!changed) return false;
        this.setSelectedFilterValues(targetDashboardUUID, values, true);
        // The target's cached counts belong to its old filters. With auto refresh off they would be shown again, so they
        // are cleared, as every other write of a dashboard's filters does through FILTER_APPLIED.
        this.getService(CustomDashboardCacheService).clearResults(targetDashboardUUID);
        return true;
    }
}

export default CustomDashboardService
