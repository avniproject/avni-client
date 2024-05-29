class DashboardReportFilters {
    filterValues; // array of DashboardReportFilter

    constructor(filterValues) {
        this.filterValues = filterValues;
    }
}

class TestDashboardReportRuleInputFactory {
    static create({filterValues = []}) {
        const dashboardReportRuleInput = new DashboardReportFilters();
        dashboardReportRuleInput.filterValues = filterValues;
        return dashboardReportRuleInput;
    }
}

export default TestDashboardReportRuleInputFactory;
