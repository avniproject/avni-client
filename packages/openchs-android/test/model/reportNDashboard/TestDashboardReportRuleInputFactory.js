import DashboardReportFilters from "../../../src/model/DashboardReportFilters";

class TestDashboardReportRuleInputFactory {
    static create({filterValues = []}) {
        const dashboardReportRuleInput = new DashboardReportFilters();
        dashboardReportRuleInput.filterValues = filterValues;
        return dashboardReportRuleInput;
    }
}

export default TestDashboardReportRuleInputFactory;
