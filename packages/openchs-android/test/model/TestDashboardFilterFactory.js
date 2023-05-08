import {DashboardFilter} from "openchs-models";

export default class TestDashboardFilterFactory {
    static create({name: name, filterConfig: filterConfig, uuid: uuid}) {
        const dashboardFilter = new DashboardFilter();
        return Object.assign(dashboardFilter, arguments[0]);
    }
}
