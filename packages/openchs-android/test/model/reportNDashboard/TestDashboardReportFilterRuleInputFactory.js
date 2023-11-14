import {DashboardReportFilterRuleInput} from "../../../src/model/DashboardReportRuleInput";

class TestDashboardReportFilterRuleInputFactory {
    static create({type, dataType, subjectType, groupSubjectTypeFilter, observationBasedFilter, filterValue}) {
        const dashboardReportFilterRuleInput = new DashboardReportFilterRuleInput();
        dashboardReportFilterRuleInput.type = type;
        dashboardReportFilterRuleInput.dataType = dataType;
        dashboardReportFilterRuleInput.subjectType = subjectType;
        dashboardReportFilterRuleInput.groupSubjectTypeFilter = groupSubjectTypeFilter;
        dashboardReportFilterRuleInput.observationBasedFilter = observationBasedFilter;
        dashboardReportFilterRuleInput.filterValue = filterValue;
        return dashboardReportFilterRuleInput;
    }
}

export default TestDashboardReportFilterRuleInputFactory;
