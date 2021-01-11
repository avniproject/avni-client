import _ from 'lodash';
import RuleEvaluationService from "../../service/RuleEvaluationService";


class CustomDashboardActions {

    static getInitialState(context) {
        return {};
    }

    static onLoad(state, action, context) {
        const ruleEvaluationService = context.get(RuleEvaluationService);
        const newState = {...state};
        const dashboards = [
            {
                name: "Dashboard 1",
                uuid: "1",
                cards: [{name: "card11", query: "", colour: "red"}, {name: "card12", query: "", colour: "blue"}]
            },
            {
                name: "Dashboard 2",
                uuid: "2",
                cards: [{name: "card21", query: "", colour: "green"}, {name: "card22", query: "", colour: "orange"}]
            },
            {
                name: "Big dashboard name dashboard3",
                uuid: "3",
                cards: [{name: "card31", query: "", colour: "yellow"}, {name: "card32", query: "", colour: "pink"}]
            }
        ];
        newState.dashboards = dashboards;
        newState.activeDashboardUUID = _.get(_.head(dashboards), 'uuid');
        const reportCards = dashboards.filter(d => d.uuid === _.get(_.head(dashboards), 'uuid'))[0].cards;
        const dummyQuery = `'use strict';
({params, imports}) => {
            return params.db.objects('Individual')
            .filtered("SUBQUERY(enrolments, $enrolment, SUBQUERY($enrolment.encounters, $encounter, $encounter.encounterDateTime >= 2020-01-01@00:00:00 and $encounter.encounterDateTime <= 2021-01-31@23:59:59 and $encounter.encounterType.name = 'Monthly monitoring of pregnant woman' and $encounter.voided = false).@count >= 4).@count > 0")
            }`;
        newState.reportCards = reportCards.map(rc => ({
            ...rc,
            count: ruleEvaluationService.getDashboardCardCount(dummyQuery)
        }));
        return newState;
    }

    static onDashboardChange(state, action, context) {
        const ruleEvaluationService = context.get(RuleEvaluationService);
        const newState = {...state};
        newState.activeDashboardUUID = action.dashboardUUID;
        const reportCards = state.dashboards.filter(d => d.uuid === action.dashboardUUID)[0].cards;
        const dummyQuery = `'use strict';
({params, imports}) => {
            return params.db.objects('Individual')
            .filtered('voided = false')
            }`;
        newState.reportCards = reportCards.map(rc => ({
            ...rc,
            count: ruleEvaluationService.getDashboardCardCount(dummyQuery)
        }));
        return newState;
    }

    static onCardPress(state, action, context) {
        const ruleEvaluationService = context.get(RuleEvaluationService);
        const newState = {...state};
        const reportCardUUID = action.reportCardUUID;
        const dummyQuery = `'use strict';
({params, imports}) => {
            return params.db.objects('Individual')
            .filtered('voided = false')
            }`;
        const result = ruleEvaluationService.getDashboardCardQueryResult(dummyQuery);
        action.cb(result, result.length);
        return newState;
    }
}


const ActionPrefix = 'CustomDashboard';

const CustomDashboardActionNames = {
    ON_LOAD: `${ActionPrefix}.ON_LOAD`,
    ON_DASHBOARD_CHANGE: `${ActionPrefix}.ON_DASHBOARD_CHANGE`,
    ON_CARD_PRESS: `${ActionPrefix}.ON_CARD_PRESS`,
};

const CustomDashboardActionMap = new Map([
    [CustomDashboardActionNames.ON_LOAD, CustomDashboardActions.onLoad],
    [CustomDashboardActionNames.ON_DASHBOARD_CHANGE, CustomDashboardActions.onDashboardChange],
    [CustomDashboardActionNames.ON_CARD_PRESS, CustomDashboardActions.onCardPress],
]);

export {CustomDashboardActionNames, CustomDashboardActionMap, CustomDashboardActions}
