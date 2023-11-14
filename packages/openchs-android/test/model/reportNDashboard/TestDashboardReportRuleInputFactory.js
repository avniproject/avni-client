import DashboardReportRuleInput from "../../../src/model/DashboardReportRuleInput";

class TestDashboardReportRuleInputFactory {
    static create({filterValues = []}) {
        const dashboardReportRuleInput = new DashboardReportRuleInput();
        dashboardReportRuleInput.filterValues = filterValues;
        return dashboardReportRuleInput;
    }
}

export default TestDashboardReportRuleInputFactory;
