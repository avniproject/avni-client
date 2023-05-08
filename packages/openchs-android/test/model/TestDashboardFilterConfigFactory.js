import {DashboardFilterConfig} from 'openchs-models';

class TestDashboardFilterConfigFactory {
    static create({type: type, widget: widget}) {
        const dashboardFilterConfig = new DashboardFilterConfig();
        dashboardFilterConfig.type = type;
        dashboardFilterConfig.widget = widget;
        return dashboardFilterConfig;
    }
}

export default TestDashboardFilterConfigFactory;
