import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import {CustomDashboardCache} from "avni-models";


@Service('customDashboardCacheService')
class CustomDashboardCacheService extends BaseService {

    constructor(db, props) {
        super(db, props);
    }

    getSchema() {
        return CustomDashboardCache.schema.name;
    }

    cachedData(dashboardUUID, filterConfigsChecksum) {
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
        return this.cachedData(dashboardUUID).getSelectedValues();
    }

}

export default CustomDashboardCacheService;
