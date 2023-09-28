import _ from 'lodash';
import CustomDashboardService from "../../service/customDashboard/CustomDashboardService";
import DashboardSectionCardMappingService from "../../service/customDashboard/DashboardSectionCardMappingService";
import EntityService from "../../service/EntityService";
import {ReportCard} from "avni-models";
import ReportCardService from "../../service/customDashboard/ReportCardService";
import General from "../../utility/General";
import DashboardFilterService from "../../service/reports/DashboardFilterService";
import CustomDashboardCacheService from '../../service/CustomDashboardCacheService';
import CryptoUtils from '../../utility/CryptoUtils';

class CustomDashboardActions {

    static getInitialState(context) {
        return {
            loading: false,
            reportCardSectionMappings: [],
            cardToCountResultMap: {},
            countUpdateTime: null,
            hasFilters: false,
            ruleInput: null,
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
        const newState = {...state};
        const onlyPrimary = action.onlyPrimary;
        const dashboardService = context.get(CustomDashboardService);
        const dashboards = dashboardService.getDashboards(onlyPrimary);
        newState.dashboards = dashboards;
        newState.activeDashboardUUID = _.get(_.head(dashboards), 'uuid');
        return CustomDashboardActions.loadCurrentDashboardInfo(context, newState);
    }

    static getReportsCards(dashboardUUID, context) {
        return context.get(DashboardSectionCardMappingService).getAllCardsForDashboard(dashboardUUID);
    }

    static onDashboardChange(state, action, context) {
        const newState = {...state};
        newState.activeDashboardUUID = action.dashboardUUID;
        return CustomDashboardActions.loadCurrentDashboardInfo(context, newState);
    }

    static loadCurrentDashboardInfo(context, newState) {
        const dashboardFilterService = context.get(DashboardFilterService);
        const customDashboardCacheService = context.get(CustomDashboardCacheService);
        const filterConfigs = dashboardFilterService.getFilterConfigsForDashboard(newState.activeDashboardUUID);
        let filterConfigsJSON = JSON.stringify(filterConfigs);
        let filterConfigsChecksum = CryptoUtils.computeHash(filterConfigsJSON);
        const cachedData = customDashboardCacheService.fetchCachedData(newState.activeDashboardUUID, filterConfigsChecksum);
        newState.filterConfigsChecksum = cachedData.getChecksum();
        newState.customDashboardFilters = cachedData.getTransformedFilters();
        newState.ruleInput = cachedData.getRuleInput();
        if (newState.activeDashboardUUID) {
            newState.reportCardSectionMappings = CustomDashboardActions.getReportsCards(newState.activeDashboardUUID, context);
            newState.hasFilters = dashboardFilterService.hasFilters(newState.activeDashboardUUID);
        }
        return newState;
    }

    // This action is responsible for loading data for multiple views. If any of the views have to be updated then this mega action has to be invoked and duplicating the callback implementation on the action. We have to break this action into smaller actions for each view. Starting with task here, which is why it invokes a different callback and the service doesn't handle task.
    static onCardPress(state, action, context) {
        const newState = {...state};
        const reportCard = context.get(EntityService).findByUUID(action.reportCardUUID, ReportCard.schema.name);
        if (reportCard.isStandardTaskType()) {
            action.goToTaskLists(reportCard.standardReportCardType.getTaskTypeType());
        } else {
            const {result, status} = context.get(ReportCardService).getReportCardResult(reportCard, state.ruleInput.ruleInputArray);
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
        const reportCardSectionMappings = state.reportCardSectionMappings;
        const newState = {...state};
        newState.ruleInput = action.filterApplied ? action.ruleInput : newState.ruleInput;
        newState.countUpdateTime = new Date(); //Update this to ensure reportCard count change is reflected
        reportCardSectionMappings.forEach(rcm => {
            const start = new Date();
            newState.cardToCountResultMap[rcm.card.uuid] = context.get(ReportCardService).getReportCardCount(rcm.card, newState.ruleInput.ruleInputArray);
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
