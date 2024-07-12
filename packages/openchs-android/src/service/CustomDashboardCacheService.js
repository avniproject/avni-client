import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import {CustomDashboardCache, Dashboard, DashboardFilterConfig, EncounterType, Program, Range, SubjectType} from "openchs-models";
import _ from "lodash";
import EntityService from "./EntityService";
import DashboardFilterService from "./reports/DashboardFilterService";
import General from "../utility/General";
import FormMetaDataSelection from "../model/FormMetaDataSelection";
import Hashes from 'jshashes';

function getDashboardCache(service, dashboardUUID) {
    let cache = service.findByFiltered("dashboard.uuid", dashboardUUID, CustomDashboardCache.schema.name);
    const dashboard = service.findByUUID(dashboardUUID, Dashboard.schema.name);
    if (_.isNil(cache)) {
        cache = CustomDashboardCache.newInstance(dashboard, getDashboardFiltersHash(dashboard));
        cache = service.save(cache, CustomDashboardCache.schema.name);
    } else if (getDashboardFiltersHash(dashboard) !== cache.dashboardFiltersHash) {
        General.logDebug("CustomDashboardCacheService", "Dashboard filters hash didn't match");
        cache = cache.clone();
        cache.reset(getDashboardFiltersHash(dashboard));
        cache = service.saveOrUpdate(cache);
    }
    return cache.clone();
}

function getDashboardFiltersHash(dashboard) {
    const str = JSON.stringify(dashboard.filters.map((x) => x.filterConfig));
    return new Hashes.MD5().hex(str);
}

@Service('customDashboardCacheService')
class CustomDashboardCacheService extends BaseService {
    constructor(db, props) {
        super(db, props);
    }

    getSchema() {
        return CustomDashboardCache.schema.name;
    }

    getDashboardCache(dashboardUUID) {
        const entityService = this.getService(EntityService);
        const dashboardCache = getDashboardCache(this, dashboardUUID);
        try {
            const selectedSerialisedValues = dashboardCache.getSelectedValues();
            const dashboardFilterService = this.getService(DashboardFilterService);

            const selectedFilterValues = {};
            Object.keys(selectedSerialisedValues).forEach((filterUuid) => {
                const dashboardFilter = dashboardFilterService.findByUUID(filterUuid);
                const dashboardFilterConfig = dashboardFilterService.getDashboardFilterConfig(dashboardFilter);
                const selectedSerialisedValue = selectedSerialisedValues[filterUuid];
                const inputDataType = dashboardFilterConfig.getInputDataType();

                General.logDebug("CustomDashboardCacheService", "loading dashboard filters from cache", dashboardFilterConfig.toDisplayText());

                if (inputDataType === DashboardFilterConfig.dataTypes.formMetaData) {
                    selectedFilterValues[filterUuid] = new FormMetaDataSelection(entityService.findAllByUUID(selectedSerialisedValue.subjectTypes, SubjectType.schema.name),
                        entityService.findAllByUUID(selectedSerialisedValue.programs, Program.schema.name),
                        entityService.findAllByUUID(selectedSerialisedValue.encounterTypes, EncounterType.schema.name)
                    );
                } else if (dashboardFilterConfig.isMultiEntityType()) {
                    selectedFilterValues[filterUuid] = entityService.findAllByUUID(selectedSerialisedValue, dashboardFilterConfig.getEntityType());
                } else if (dashboardFilterConfig.isDateLikeFilterType()) {
                    selectedFilterValues[filterUuid] = new Date(selectedSerialisedValue);
                } else if (dashboardFilterConfig.isDateLikeRangeFilterType()) {
                    selectedFilterValues[filterUuid] = new Range(new Date(selectedSerialisedValue.minValue), new Date(selectedSerialisedValue.maxValue));
                } else if (dashboardFilterConfig.isNumericRangeFilterType()) {
                    selectedFilterValues[filterUuid] = new Range(selectedSerialisedValue.minValue, selectedSerialisedValue.maxValue);
                } else {
                    selectedFilterValues[filterUuid] = selectedSerialisedValue;
                }
            });
            return {selectedFilterValues, dashboardCache};
        } catch (e) {
            General.logError("CustomDashboardCacheService", e);
            dashboardCache.reset(getDashboardFiltersHash(dashboardCache.dashboard));
            this.saveOrUpdate(dashboardCache, CustomDashboardCache.schema.name);
            return {selectedFilterValues: {}, dashboardCache};
        }
    }

    reset(dashboardUUID) {
        const cache = getDashboardCache(this, dashboardUUID);
        this.delete(cache);
    }

    resetAllDashboards() {
        this.deleteAll();
    }

    // Empty, null values should not be serialised.
    // Assume that the filter value for non primitives will not be null
    setSelectedFilterValues(dashboardUUID, selectedFilterValues, filterApplied) {
        const dashboardCache = getDashboardCache(this, dashboardUUID);
        dashboardCache.filterApplied = filterApplied;

        const dashboardFilterService = this.getService(DashboardFilterService);
        const serialisedSelectedValues = {};

        Object.keys(selectedFilterValues).forEach((filterUuid) => {
            const dashboardFilter = dashboardFilterService.findByUUID(filterUuid);
            const dashboardFilterConfig = dashboardFilterService.getDashboardFilterConfig(dashboardFilter);

            const selectedFilterValue = selectedFilterValues[filterUuid];
            const inputDataType = dashboardFilterConfig.getInputDataType();

            General.logDebug("CustomDashboardCacheService", "Setting filter value", dashboardFilterConfig.toDisplayText());

            if (inputDataType === DashboardFilterConfig.dataTypes.formMetaData && !selectedFilterValue.isEmpty()) {
                serialisedSelectedValues[filterUuid] = {
                    subjectTypes: selectedFilterValue.subjectTypes.map(x => x.uuid),
                    programs: selectedFilterValue.programs.map(x => x.uuid),
                    encounterTypes: selectedFilterValue.encounterTypes.map(x => x.uuid)
                };
            } else if (dashboardFilterConfig.isMultiEntityType() && !_.isEmpty(selectedFilterValue)) {
                serialisedSelectedValues[filterUuid] = selectedFilterValue.map(x => x.uuid);
            } else if ((dashboardFilterConfig.isDateLikeRangeFilterType() || dashboardFilterConfig.isNumericRangeFilterType()) && !selectedFilterValue.isEmpty()) {
                serialisedSelectedValues[filterUuid] = selectedFilterValue;
            } else if (dashboardFilterConfig.isNonCodedObservationDataType() && !_.isEmpty(selectedFilterValue)) {
                serialisedSelectedValues[filterUuid] = selectedFilterValue;
            } else if (dashboardFilterConfig.isDateLikeFilterType() && _.isDate(selectedFilterValue)) {
                serialisedSelectedValues[filterUuid] = selectedFilterValue;
            }
        });

        dashboardCache.selectedValuesJSON = JSON.stringify(serialisedSelectedValues);
        dashboardCache.dashboardFiltersHash = getDashboardFiltersHash(dashboardCache.dashboard);
        this.saveOrUpdate(dashboardCache);
    }

    updateNestedCardResults(dashboardUUID, reportCard, results) {
        const dashboardCache = getDashboardCache(this, dashboardUUID);
        _.remove(dashboardCache.nestedReportCardResults, (x) => x.reportCard === reportCard.uuid && x.dashboard === dashboardCache.dashboard.uuid);
        results.forEach(result => {
            result.dashboard = dashboardCache.dashboard.uuid;
            result.reportCard = reportCard.uuid;
            dashboardCache.nestedReportCardResults.push(result);
        });
        dashboardCache.updatedAt = new Date();
        this.saveOrUpdate(dashboardCache);
    }

    clearResults(dashboardUUID) {
        const dashboardCache = getDashboardCache(this, dashboardUUID);
        dashboardCache.reportCardResults = [];
        dashboardCache.nestedReportCardResults = [];
        dashboardCache.updatedAt = null;
        this.saveOrUpdate(dashboardCache);
    }

    clearAllDashboardResults(dashboards) {
        const thisService = this;
        dashboards.forEach((x) => {
            thisService.clearResults(x.uuid);
        });
    }

    updateReportCardResult(dashboardUUID, reportCard, reportCardResult) {
        const db = this.db;
        db.write(() => {
            let dashboardCache = this.findByFiltered("dashboard.uuid", dashboardUUID, CustomDashboardCache.schema.name);
            dashboardCache.updatedAt = new Date();
            _.remove(dashboardCache.reportCardResults, (x) => x.reportCard === reportCard.uuid && x.dashboard === dashboardCache.dashboard.uuid);
            reportCardResult.dashboard = dashboardUUID;
            reportCardResult.reportCard = reportCard.uuid;
            dashboardCache.reportCardResults.push(reportCardResult);
        });
    }
}

export default CustomDashboardCacheService;
