import _ from 'lodash';
import RuleEvaluationService from "../../service/RuleEvaluationService";
import CustomDashboardService from "../../service/customDashboard/CustomDashboardService";
import DashboardCardMappingService from "../../service/customDashboard/DashboardCardMappingService";
import EntityService from "../../service/EntityService";
import {ReportCard} from "avni-models";

class CustomDashboardActions {

    static getInitialState(context) {
        return {};
    }

    static onLoad(state, action, context) {
        const dashboardService = context.get(CustomDashboardService);
        const newState = {...state};
        const dashboards = dashboardService.getAllDashboards();
        newState.dashboards = dashboards;
        const firstDashboardUUID = _.get(_.head(dashboards), 'uuid');
        newState.activeDashboardUUID = firstDashboardUUID;
        if (firstDashboardUUID) {
            newState.reportCards = CustomDashboardActions.getReportsCardsWithQueryCount(firstDashboardUUID, context);
        }
        return newState;
    }

    static getReportsCardsWithQueryCount(dashboardUUID, context) {
        const reportCards = context.get(DashboardCardMappingService).getAllCardsForDashboard(dashboardUUID);
        return reportCards.map(rc => ({
            ...rc,
            count: context.get(RuleEvaluationService).getDashboardCardCount(rc.query)
        }));
    }

    static onDashboardChange(state, action, context) {
        const newState = {...state};
        newState.activeDashboardUUID = action.dashboardUUID;
        newState.reportCards = CustomDashboardActions.getReportsCardsWithQueryCount(action.dashboardUUID, context);
        return newState;
    }

    static onCardPress(state, action, context) {
        const ruleEvaluationService = context.get(RuleEvaluationService);
        const newState = {...state};
        const reportCard = context.get(EntityService).findByUUID(action.reportCardUUID, ReportCard.schema.name);
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
