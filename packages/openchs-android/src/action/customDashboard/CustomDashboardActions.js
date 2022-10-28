import _ from 'lodash';
import CustomDashboardService from "../../service/customDashboard/CustomDashboardService";
import DashboardSectionCardMappingService from "../../service/customDashboard/DashboardSectionCardMappingService";
import EntityService from "../../service/EntityService";
import {ReportCard} from "avni-models";
import ReportCardService from "../../service/customDashboard/ReportCardService";
import General from "../../utility/General";

class CustomDashboardActions {

    static getInitialState(context) {
        return {
            loading: false,
            reportCardSectionMappings: [],
            cardToCountResultMap: {},
            countUpdateTime: null
        };
    }

    static onLoad(state, action, context) {
        const dashboardService = context.get(CustomDashboardService);
        const newState = {...state};
        const onlyPrimary = action.onlyPrimary;
        const dashboards = dashboardService.getDashboards(onlyPrimary);
        newState.dashboards = dashboards;
        const firstDashboardUUID = _.get(_.head(dashboards), 'uuid');
        newState.activeDashboardUUID = firstDashboardUUID;
        if (firstDashboardUUID) {
            newState.reportCardSectionMappings = CustomDashboardActions.getReportsCards(firstDashboardUUID, context);
        }
        return newState;
    }

    static getReportsCards(dashboardUUID, context) {
        return context.get(DashboardSectionCardMappingService).getAllCardsForDashboard(dashboardUUID);
    }

    static onDashboardChange(state, action, context) {
        const newState = {...state};
        newState.activeDashboardUUID = action.dashboardUUID;
        newState.reportCardSectionMappings = CustomDashboardActions.getReportsCards(action.dashboardUUID, context);
        return newState;
    }

    static onCardPress(state, action, context) {
        const newState = {...state};
        const reportCard = context.get(EntityService).findByUUID(action.reportCardUUID, ReportCard.schema.name);
        const {result, status} = context.get(ReportCardService).getReportCardResult(reportCard);
        const standardReportCardType = reportCard.standardReportCardType;
        const viewName = CustomDashboardActions._getViewName(standardReportCardType);
        if (!_.isNil(result)) {
            setTimeout(() => action.cb(result, result.length, status, viewName), 0);
        }
        return newState;
    }

    static _getViewName(standardReportCardType) {
        switch (true) {
            case _.isNil(standardReportCardType) :
                return 'IndividualSearchResultPaginatedView';
            case standardReportCardType.isApprovalType() :
                return 'ApprovalListingView';
            case standardReportCardType.isDefaultType() :
                return 'IndividualListView';
            case standardReportCardType.isCommentType() :
                return 'CommentListView';
            case standardReportCardType.isTaskType() :
                return 'TaskListView';
        }
    }

    static refreshCount(state, action, context) {
        const reportCardSectionMappings = state.reportCardSectionMappings;
        const newState = {...state};
        newState.countUpdateTime = new Date(); //Update this to ensure reportCard count change is reflected
        reportCardSectionMappings.forEach(rcm => {
            const start = new Date();
            newState.cardToCountResultMap[rcm.card.uuid] = context.get(ReportCardService).getReportCardCount(rcm.card);
            General.logDebug('CustomDashboardActions', `${rcm.card.name} took ${new Date() - start} ms`);
        });
        return newState;
    }

    static removeOlderCounts(state) {
        const reportCardSectionMappings = state.reportCardSectionMappings;
        const newState = {...state};
        newState.countUpdateTime = new Date(); //Update this to ensure reportCard count change is reflected
        reportCardSectionMappings.forEach(rcm => {
            newState.cardToCountResultMap[rcm.card.uuid]= null;
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
    LOAD_INDICATOR: `${ActionPrefix}.LOAD_INDICATOR`,
    REFRESH_COUNT: `${ActionPrefix}.REFRESH_COUNT`,
    REMOVE_OLDER_COUNTS: `${ActionPrefix}.REMOVE_OLDER_COUNTS`,
};

const CustomDashboardActionMap = new Map([
    [CustomDashboardActionNames.ON_LOAD, CustomDashboardActions.onLoad],
    [CustomDashboardActionNames.ON_DASHBOARD_CHANGE, CustomDashboardActions.onDashboardChange],
    [CustomDashboardActionNames.ON_CARD_PRESS, CustomDashboardActions.onCardPress],
    [CustomDashboardActionNames.LOAD_INDICATOR, CustomDashboardActions.loadIndicator],
    [CustomDashboardActionNames.REFRESH_COUNT, CustomDashboardActions.refreshCount],
    [CustomDashboardActionNames.REMOVE_OLDER_COUNTS, CustomDashboardActions.removeOlderCounts],
]);

export {CustomDashboardActionNames, CustomDashboardActionMap, CustomDashboardActions}
