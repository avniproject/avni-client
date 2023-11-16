// Objects has been used in place of arrays to allow for flexibility in contract in the future.

export class DashboardReportFilter {
    type;
    dataType;
    subjectType;
    groupSubjectTypeFilter;
    observationBasedFilter;
    filterValue;
}

class DashboardReportFilters {
    filterValues; // array of DashboardReportFilter

    constructor(filterValues) {
        this.filterValues = filterValues;
    }
}

export default DashboardReportFilters;
