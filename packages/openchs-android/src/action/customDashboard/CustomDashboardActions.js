import _ from 'lodash';
import CustomDashboardService from "../../service/customDashboard/CustomDashboardService";
import DashboardCardMappingService from "../../service/customDashboard/DashboardCardMappingService";
import EntityService from "../../service/EntityService";
import {ReportCard} from "avni-models";
import ReportCardService from "../../service/customDashboard/ReportCardService";

class CustomDashboardActions {

    static getInitialState(context) {
        return {
            loading: false
        };
    }

    static onLoad(state, action, context) {
        const dashboardService = context.get(CustomDashboardService);
        const newState = {...state};
        const dashboards = dashboardService.getAllDashboards();
        newState.dashboards = dashboards;
        const firstDashboardUUID = _.get(_.head(dashboards), 'uuid');
        newState.activeDashboardUUID = firstDashboardUUID;
        if (firstDashboardUUID) {
            newState.reportCardMappings = CustomDashboardActions.getReportsCards(firstDashboardUUID, context);
        }
        return newState;
    }

    static getReportsCards(dashboardUUID, context, oldCardMappings) {
        const newCardMappings = context.get(DashboardCardMappingService).getAllCardsForDashboard(dashboardUUID);
        return _.unionBy(oldCardMappings, newCardMappings, 'uuid');
    }

    static onDashboardChange(state, action, context) {
        const newState = {...state};
        newState.activeDashboardUUID = action.dashboardUUID;
        newState.reportCardMappings = CustomDashboardActions.getReportsCards(action.dashboardUUID, context, state.reportCardMappings);
        return newState;
    }

    static onCardPress(state, action, context) {
        const newState = {...state};
        const reportCard = context.get(EntityService).findByUUID(action.reportCardUUID, ReportCard.schema.name);
        const {result, status} = context.get(ReportCardService).getReportCardResult(reportCard);
        const viewName = !_.isNil(reportCard.standardReportCardType) ? 'ApprovalListingView' : 'IndividualSearchResultPaginatedView';
        action.cb(result, result.length, status, viewName);
        return newState;
    }

    static executeCountQuery(state, action, context) {
        const reportCardMappings = state.reportCardMappings;
        const newState = {...state};
        const reportCardUUID = action.reportCardUUID;
        newState.reportCardMappings = reportCardMappings.map(rcm => {
            const reportCard = rcm.card;
            const isCountRequired = _.isNil(reportCard.count) || !_.isNil(reportCard.standardReportCardType);
            if (reportCard.uuid === reportCardUUID && isCountRequired) {
                const cardMappingsWithCount = {...rcm};
                cardMappingsWithCount.card.count = context.get(ReportCardService).getReportCardCount(reportCard);
                return cardMappingsWithCount;
            } else return rcm
        });
        return newState;
    }

    static loadIndicator(state, action) {
        const newState = {...state};
        newState.loading = action.loading;
        return newState;
    }
}


const ActionPrefix = 'CustomDashboard';

const CustomDashboardActionNames = {
    ON_LOAD: `${ActionPrefix}.ON_LOAD`,
    ON_DASHBOARD_CHANGE: `${ActionPrefix}.ON_DASHBOARD_CHANGE`,
    ON_CARD_PRESS: `${ActionPrefix}.ON_CARD_PRESS`,
    EXECUTE_COUNT_QUERY: `${ActionPrefix}.EXECUTE_COUNT_QUERY`,
    LOAD_INDICATOR: `${ActionPrefix}.LOAD_INDICATOR`,
};

const CustomDashboardActionMap = new Map([
    [CustomDashboardActionNames.ON_LOAD, CustomDashboardActions.onLoad],
    [CustomDashboardActionNames.ON_DASHBOARD_CHANGE, CustomDashboardActions.onDashboardChange],
    [CustomDashboardActionNames.ON_CARD_PRESS, CustomDashboardActions.onCardPress],
    [CustomDashboardActionNames.EXECUTE_COUNT_QUERY, CustomDashboardActions.executeCountQuery],
    [CustomDashboardActionNames.LOAD_INDICATOR, CustomDashboardActions.loadIndicator],
]);

export {CustomDashboardActionNames, CustomDashboardActionMap, CustomDashboardActions}
