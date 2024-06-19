import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import {CustomDashboardCache} from "openchs-models";
import _ from "lodash";
import EntityService from "./EntityService";
import {Concept, CustomFilter, Dashboard, EncounterType, Range, Program, SubjectType} from "openchs-models";
import DashboardFilterService from "./reports/DashboardFilterService";
import General from "../utility/General";
import FormMetaDataSelection from "../model/FormMetaDataSelection";
import Hashes from 'jshashes';

function getDashboardCache(service, dashboardUUID) {
    let cache = service.findByFiltered("dashboard.uuid", dashboardUUID, CustomDashboardCache.schema.name);
    const dashboard = service.findByUUID(dashboardUUID, Dashboard.schema.name);
    if (_.isNil(cache)) {
        cache = service.save(CustomDashboardCache.newInstance(dashboard), CustomDashboardCache.schema.name);
    } else if (getDashboardFiltersHash(dashboard) !== cache.dashboardFiltersHash) {
        General.logDebugTemp("CustomDashboardCacheService", "Dashboard filters hash didn't match");
        cache = cache.clone();
        cache.reset();
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

    getDashboardCache(dashboardUUID, dataTypeDetails) {
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

                if (dashboardFilterConfig.type === CustomFilter.type.SubjectType) {
                    selectedFilterValues[filterUuid] = new FormMetaDataSelection(entityService.findAllByUUID(selectedSerialisedValue.subjectTypes, SubjectType),
                        entityService.findAllByUUID(selectedSerialisedValue.programs, Program),
                        entityService.findAllByUUID(selectedSerialisedValue.encounterTypes, EncounterType)
                    );
                } else if (dataTypeDetails.has(inputDataType) && dataTypeDetails.get(inputDataType).isArray) {
                    selectedFilterValues[filterUuid] = entityService.findAllByUUID(selectedSerialisedValue, dataTypeDetails.get(inputDataType).type);
                } else if (dataTypeDetails.has(inputDataType)) {
                    selectedFilterValues[filterUuid] = entityService.findByUUID(selectedSerialisedValue, dataTypeDetails.get(inputDataType).type);
                } else if (inputDataType === Concept.dataType.Date && !_.isNil(selectedSerialisedValue)) {
                    selectedFilterValues[filterUuid] = new Date(selectedSerialisedValue);
                } else if (inputDataType === Range.DateRange) {
                    selectedFilterValues[filterUuid] = new Range(selectedSerialisedValue.minValue, selectedSerialisedValue.maxValue);
                } else {
                    selectedFilterValues[filterUuid] = selectedSerialisedValue;
                }
            });
            return {selectedFilterValues, dashboardCache};
        } catch (e) {
            General.logError("CustomDashboardCacheService", e);
            dashboardCache.reset();
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

    setSelectedFilterValues(dashboardUUID, selectedFilterValues, filterApplied, dataTypeDetails) {
        const dashboardCache = getDashboardCache(this, dashboardUUID);
        dashboardCache.filterApplied = filterApplied;
        dashboardCache.updatedAt = new Date();

        const dashboardFilterService = this.getService(DashboardFilterService);
        const serialisedSelectedValues = {};

        //null and empty values are not saved
        Object.keys(selectedFilterValues).forEach((filterUuid) => {
            const dashboardFilter = dashboardFilterService.findByUUID(filterUuid);
            const dashboardFilterConfig = dashboardFilterService.getDashboardFilterConfig(dashboardFilter);

            const selectedFilterValue = selectedFilterValues[filterUuid];
            const inputDataType = dashboardFilterConfig.getInputDataType();
            if (!_.isNil(selectedFilterValue)) {
                if (dashboardFilterConfig.type === CustomFilter.type.SubjectType) {
                    serialisedSelectedValues[filterUuid] = {
                        subjectTypes: selectedFilterValue.subjectTypes.map(x => x.uuid),
                        programs: selectedFilterValue.programs.map(x => x.uuid),
                        encounterTypes: selectedFilterValue.encounterTypes.map(x => x.uuid)
                    };
                } else {
                    if (dataTypeDetails.has(inputDataType) &&
                        dataTypeDetails.get(inputDataType).isArray &&
                        !_.isEmpty(selectedFilterValue)) {
                        serialisedSelectedValues[filterUuid] = selectedFilterValue.map(x => x.uuid);
                    } else if (dataTypeDetails.has(inputDataType)) {
                        serialisedSelectedValues[filterUuid] = _.get(selectedFilterValue, "uuid");
                    } else {
                        serialisedSelectedValues[filterUuid] = selectedFilterValue;
                    }
                }
            }
        });

        dashboardCache.selectedValuesJSON = JSON.stringify(serialisedSelectedValues);
        dashboardCache.dashboardFiltersHash = getDashboardFiltersHash(dashboardCache.dashboard);
        this.saveOrUpdate(dashboardCache);
    }
}

export default CustomDashboardCacheService;
