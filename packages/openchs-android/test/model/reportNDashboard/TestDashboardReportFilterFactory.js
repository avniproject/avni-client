import {DashboardReportFilter} from "../../../src/model/DashboardReportFilters";

class TestDashboardReportFilterFactory {
    static create({type, dataType, subjectType, groupSubjectTypeFilter, observationBasedFilter, filterValue}) {
        const entity = new DashboardReportFilter();
        entity.type = type;
        entity.dataType = dataType;
        entity.subjectType = subjectType;
        entity.groupSubjectTypeFilter = groupSubjectTypeFilter;
        entity.observationBasedFilter = observationBasedFilter;
        entity.filterValue = filterValue;
        return entity;
    }
}

export default TestDashboardReportFilterFactory;
