import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import {CustomDashboardCache} from "avni-models";
import _ from "lodash";
import EntityService from "./EntityService";
import {AddressLevel, Concept, CustomFilter, Dashboard, EncounterType, Gender, Individual, Program, SubjectType} from "openchs-models";
import DashboardFilterService from "./reports/DashboardFilterService";
import General from "../utility/General";

const dataTypeDetails = new Map();
dataTypeDetails.set(Concept.dataType.Coded, {type: Concept, isArray: true});
dataTypeDetails.set(CustomFilter.type.Gender, {type: Gender, isArray: true});
dataTypeDetails.set(CustomFilter.type.Address, {type: AddressLevel, isArray: true});
dataTypeDetails.set(CustomFilter.type.GroupSubject, {type: Individual, isArray: false});

function getDashboardCache(service, dashboardUUID) {
    let cache = service.findByFiltered("dashboard.uuid", dashboardUUID, CustomDashboardCache.schema.name);
    if (_.isNil(cache)) {
        const dashboard = service.findByUUID(dashboardUUID, Dashboard.schema.name);
        cache = service.save(CustomDashboardCache.newInstance(dashboard), CustomDashboardCache.schema.name);
    }
    return cache.clone();
}

@Service('customDashboardCacheService')
class CustomDashboardCacheService extends BaseService {
    constructor(db, props) {
        super(db, props);
    }

    getSchema() {
        return CustomDashboardCache.schema.name;
    }

    clearAllCache() {
        this.db.write(() => {
            this.db.delete(this.db.objects(CustomDashboardCache.schema.name));
        });
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

                if (dashboardFilterConfig.type === CustomFilter.type.SubjectType) {
                    selectedFilterValues[filterUuid] = {
                        subjectTypes: entityService.findAllByUUID(selectedSerialisedValue.subjectTypes, SubjectType),
                        programs: entityService.findAllByUUID(selectedSerialisedValue.programs, Program),
                        encounterTypes: entityService.findAllByUUID(selectedSerialisedValue.encounterTypes, EncounterType)
                    };
                } else if (dataTypeDetails.has(inputDataType) && dataTypeDetails.get(inputDataType).isArray) {
                    selectedFilterValues[filterUuid] = entityService.findAllByUUID(selectedSerialisedValue, dataTypeDetails.get(inputDataType).type);
                } else if (dataTypeDetails.has(inputDataType)) {
                    selectedFilterValues[filterUuid] = entityService.findByUUID(selectedSerialisedValue, dataTypeDetails.get(inputDataType).type);
                } else {
                    selectedFilterValues[filterUuid] = selectedSerialisedValue;
                }
            });
            return {selectedFilterValues, dashboardCache};
        } catch (e) {
            General.logError("CustomDashboardCacheService",  e);
            dashboardCache.reset();
            this.saveOrUpdate(dashboardCache, CustomDashboardCache.schema.name);
            return {selectedFilterValues: {}, dashboardCache};
        }
    }

    reset(dashboardUUID) {
        const cache = getDashboardCache(this, dashboardUUID);
        cache.reset();
        this.saveOrUpdate(cache);
    }

    setSelectedFilterValues(dashboardUUID, selectedFilterValues, filterApplied) {
        const dashboardCache = getDashboardCache(this, dashboardUUID);
        dashboardCache.filterApplied = filterApplied;
        dashboardCache.updatedAt = new Date();

        const dashboardFilterService = this.getService(DashboardFilterService);
        const serialisedSelectedValues = {};

        //null and empty values are not saved
        Object.keys(selectedFilterValues).forEach((filterUuid) => {
            const dashboardFilter = dashboardFilterService.findByUUID(filterUuid);
            const dashboardFilterConfig = dashboardFilterService.getDashboardFilterConfig(dashboardFilter);

            if (dashboardFilterConfig.type === CustomFilter.type.SubjectType) {
                serialisedSelectedValues[filterUuid] = {
                    subjectTypes: selectedFilterValues[filterUuid].subjectTypes.map(x => x.uuid),
                    programs: selectedFilterValues[filterUuid].programs.map(x => x.uuid),
                    encounterTypes: selectedFilterValues[filterUuid].encounterTypes.map(x => x.uuid)
                };
            } else if (dataTypeDetails.has(dashboardFilterConfig.getInputDataType()) &&
                dataTypeDetails.get(dashboardFilterConfig.getInputDataType()).isArray &&
                !_.isEmpty(selectedFilterValues[filterUuid])) {
                serialisedSelectedValues[filterUuid] = selectedFilterValues[filterUuid].map(x => x.uuid);
            } else if (dataTypeDetails.has(dashboardFilterConfig.getInputDataType()) && !_.isNil(selectedFilterValues[filterUuid])) {
                serialisedSelectedValues[filterUuid] = _.get(selectedFilterValues[filterUuid], "uuid");
            } else if (!_.isNil(selectedFilterValues[filterUuid])) {
                serialisedSelectedValues[filterUuid] = selectedFilterValues[filterUuid];
            }
        });

        dashboardCache.selectedValuesJSON = JSON.stringify(serialisedSelectedValues);
        this.saveOrUpdate(dashboardCache);
    }

    resetCache(dashboardUUID) {
        return CustomDashboardCache.createEmptyInstance();
    }
}

export default CustomDashboardCacheService;
