import StubbedBaseService from "../StubbedBaseService";
import {CustomDashboardCache} from 'openchs-models';

class StubbedCustomDashboardCacheService extends StubbedBaseService {

    getSchema() {
        return CustomDashboardCache.schema.name;
    }

    fetchCachedData(dashboardUUID, filterConfigsChecksum) {
        const cache = this.findByUUID(dashboardUUID);
        if (cache === undefined || cache.getChecksum() !== filterConfigsChecksum) {
            return CustomDashboardCache.createEmptyInstance();
        }
        return cache;
    }

    resetCache(dashboardUUID) {
        return CustomDashboardCache.createEmptyInstance();
    }

    selectedValues(dashboardUUID) {
        return this.fetchCachedData(dashboardUUID).getSelectedValues();
    }
}

export default StubbedCustomDashboardCacheService;
