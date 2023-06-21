import _ from 'lodash';
import CustomDashboardService from "../../service/customDashboard/CustomDashboardService";
import DashboardSectionCardMappingService from "../../service/customDashboard/DashboardSectionCardMappingService";
import EntityService from "../../service/EntityService";
import {ReportCard} from "avni-models";
import ReportCardService from "../../service/customDashboard/ReportCardService";
import General from "../../utility/General";
import DashboardFilterService from "../../service/reports/DashboardFilterService";
import CustomDashboardCacheService from '../../service/CustomDashboardCacheService';

class CustomDashboardActions {

    static getInitialState(context) {
        return {
            loading: false,
            reportCardSectionMappings: [],
            cardToCountResultMap: {},
            countUpdateTime: null,
            hasFilters: false,
            ruleInput: null,
            prevDashboardUUID: '',
            activeDashboardUUID: '',
            customDashboardFilters: this.getDefaultCustomDashboardFilters(),
        };
    }

    static getDefaultCustomDashboardFilters() {
        return {
            applied: false,
            selectedLocations: [],
            selectedCustomFilters: [],
            selectedGenders: [],
        };
    }

    static onLoad(state, action, context) {
        const dashboardService = context.get(CustomDashboardService);
        const dashboardFilterService = context.get(DashboardFilterService);

        const customDashboardCacheService = context.get(CustomDashboardCacheService);

        const newState = {...state};
        const onlyPrimary = action.onlyPrimary;
        const dashboards = dashboardService.getDashboards(onlyPrimary);
        newState.dashboards = dashboards;
        const firstDashboardUUID = _.get(_.head(dashboards), 'uuid');
        newState.activeDashboardUUID = firstDashboardUUID;
        newState.prevDashboardUUID = state.activeDashboardUUID;
        const cachedData = customDashboardCacheService.cachedData(newState.activeDashboardUUID);

        //TODO Use checksum to determine if we should use cached data
        newState.customDashboardFilters = cachedData.getTransformedFilters();
        newState.ruleInput = cachedData.getRuleInput();
        if (firstDashboardUUID) {
            newState.reportCardSectionMappings = CustomDashboardActions.getReportsCards(firstDashboardUUID, context);
            newState.hasFilters = dashboardFilterService.hasFilters(firstDashboardUUID);
        }
        return newState;
    }

    static getReportsCards(dashboardUUID, context) {
        return context.get(DashboardSectionCardMappingService).getAllCardsForDashboard(dashboardUUID);
    }

    static onDashboardChange(state, action, context) {
        const dashboardFilterService = context.get(DashboardFilterService);
        const customDashboardCacheService = context.get(CustomDashboardCacheService);

        const newState = {...state};
        const cachedData = customDashboardCacheService.cachedData(action.dashboardUUID);
        newState.activeDashboardUUID = action.dashboardUUID;
        newState.prevDashboardUUID = state.activeDashboardUUID;
        newState.reportCardSectionMappings = CustomDashboardActions.getReportsCards(action.dashboardUUID, context);
        newState.hasFilters = dashboardFilterService.hasFilters(action.dashboardUUID);
        newState.customDashboardFilters = cachedData.getTransformedFilters();
        newState.ruleInput = cachedData.getRuleInput();
        return newState;
    }

    // This action is responsible for loading data for multiple views. If any of the views have to be updated then this mega action has to be invoked and duplicating the callback implementation on the action. We have to break this action into smaller actions for each view. Starting with task here, which is why it invokes a different callback and the service doesn't handle task.
    static onCardPress(state, action, context) {
        const newState = {...state};
        const reportCard = context.get(EntityService).findByUUID(action.reportCardUUID, ReportCard.schema.name);
        if (reportCard.isStandardTaskType()) {
            action.goToTaskLists(reportCard.standardReportCardType.getTaskTypeType());
        } else {
            const {result, status} = context.get(ReportCardService).getReportCardResult(reportCard, state.ruleInput);
            const standardReportCardType = reportCard.standardReportCardType;
            const viewName = CustomDashboardActions._getViewName(standardReportCardType);
            if (!_.isNil(result)) {
                setTimeout(() => action.cb(result, result.length, status, viewName), 0);
            }
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
            case standardReportCardType.isChecklistType():
                return 'ChecklistListingView';
        }
    }

    static refreshCount(state, action, context) {
        const newState = {...state};
        newState.prevDashboardUUID = state.activeDashboardUUID;
        let ruleInput = newState.ruleInput.ruleInputArray;
        if(action.filterApplied) {
            ruleInput = action.ruleInput.ruleInputArray;
        }
        const reportCardSectionMappings = state.reportCardSectionMappings;
        newState.countUpdateTime = new Date(); //Update this to ensure reportCard count change is reflected
        reportCardSectionMappings.forEach(rcm => {
            const start = new Date();
            newState.cardToCountResultMap[rcm.card.uuid] = context.get(ReportCardService).getReportCardCount(rcm.card, ruleInput);
            General.logDebug('CustomDashboardActions', `${rcm.card.name} took ${new Date() - start} ms`);
        });
        return newState;
    }

    static removeOlderCounts(state) {
        const newState = {...state};
        const reportCardSectionMappings = state.reportCardSectionMappings;
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

    static setCustomDashboardFilters(state, action, context) {
        const newState = {...state};
        newState.customDashboardFilters = action.filterApplied ? action.customDashboardFilters
          : CustomDashboardActions.getDefaultCustomDashboardFilters();
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
    SET_DASHBOARD_FILTERS: `${ActionPrefix}.SET_DASHBOARD_FILTERS`,
};

const CustomDashboardActionMap = new Map([
    [CustomDashboardActionNames.ON_LOAD, CustomDashboardActions.onLoad],
    [CustomDashboardActionNames.ON_DASHBOARD_CHANGE, CustomDashboardActions.onDashboardChange],
    [CustomDashboardActionNames.ON_CARD_PRESS, CustomDashboardActions.onCardPress],
    [CustomDashboardActionNames.LOAD_INDICATOR, CustomDashboardActions.loadIndicator],
    [CustomDashboardActionNames.REFRESH_COUNT, CustomDashboardActions.refreshCount],
    [CustomDashboardActionNames.REMOVE_OLDER_COUNTS, CustomDashboardActions.removeOlderCounts],
    [CustomDashboardActionNames.SET_DASHBOARD_FILTERS, CustomDashboardActions.setCustomDashboardFilters],
]);

export {CustomDashboardActionNames, CustomDashboardActionMap, CustomDashboardActions}
