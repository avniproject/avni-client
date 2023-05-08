import StubbedBaseService from "../StubbedBaseService";

class StubbedDashboardFilterService extends StubbedBaseService {
    ruleInputFileConfig; ruleInputFilterValue;

    getFilters(dashboardUUID) {
        return this.serviceData["filters"][dashboardUUID];
    }

    getFilterConfigsForDashboard(dashboardUUID) {
        const filters = this.getFilters(dashboardUUID);
        const returnObj = {};
        filters.forEach((x) => {
            returnObj[x.uuid] = x.filterConfig;
        });
        return returnObj;
    }

    toRuleInputObject(filterConfig, filterValue) {
        this.capturedData.ruleInputFileConfig = filterConfig;
        this.capturedData.ruleInputFilterValue = filterValue;
    }
}

export default StubbedDashboardFilterService;
