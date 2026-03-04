import StubbedBaseService from "../StubbedBaseService";
import {CustomDashboardCache} from 'openchs-models';
import _ from "lodash";

class StubbedCustomDashboardCacheService extends StubbedBaseService {

    getSchema() {
        return CustomDashboardCache.schema.name;
    }

    fetchCachedData(dashboardUUID) {
        const cache = this.findByUUID(dashboardUUID);
        if (_.isNil(cache)) {
            return CustomDashboardCache.newInstance();
        }
        return cache;
    }

    selectedValues(dashboardUUID) {
        return this.fetchCachedData(dashboardUUID).getSelectedValues();
    }
}

export default StubbedCustomDashboardCacheService;
