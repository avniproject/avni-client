// Objects has been used in place of arrays to allow for flexibility in contract in the future.

import _ from "lodash";
import {CustomFilter} from "openchs-models";

export class DashboardReportFilter {
    type;
    dataType;
    subjectType;
    groupSubjectTypeFilter;
    observationBasedFilter;
    filterValue;

    static getAddressFilter(reportFilters) {
        if (_.isNil(reportFilters)) return null;
        return _.find(reportFilters, (x: DashboardReportFilter) => x.type === CustomFilter.type.Address);
    }
}

class DashboardReportFilters {
    filterValues; // array of DashboardReportFilter

    constructor(filterValues) {
        this.filterValues = filterValues;
    }
}

export default DashboardReportFilters;
