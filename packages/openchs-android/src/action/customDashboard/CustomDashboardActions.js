import _ from 'lodash';
import CustomDashboardService, {CustomDashboardType} from "../../service/customDashboard/CustomDashboardService";
import DashboardSectionCardMappingService from "../../service/customDashboard/DashboardSectionCardMappingService";
import EntityService from "../../service/EntityService";
import {ReportCard, NestedReportCardResult} from "openchs-models";
import ReportCardService from "../../service/customDashboard/ReportCardService";
import General from "../../utility/General";
import DashboardFilterService from "../../service/reports/DashboardFilterService";
import MessageService from '../../service/MessageService';
import CustomDashboardCacheService from "../../service/CustomDashboardCacheService";
import UserInfoService from "../../service/UserInfoService";

function getReportsCards(dashboardUUID, context) {
    return context.get(DashboardSectionCardMappingService).getAllCardsForDashboard(dashboardUUID);
}

function filterUpdated(context, state) {
    const customDashboardCacheService = context.get(CustomDashboardCacheService);
    customDashboardCacheService.clearResults(state.activeDashboardUUID);
    return state;
}

function loadCurrentDashboardInfo(context, state) {
    const dashboardFilterService = context.get(DashboardFilterService);
    state.filtersPresent = dashboardFilterService.areFiltersPresent(state.activeDashboardUUID);
    const {selectedFilterValues} = context.get(CustomDashboardService).getDashboardData(state.activeDashboardUUID);
    state.customDashboardFilters = selectedFilterValues;
    if (state.activeDashboardUUID) {
        state.reportCardSectionMappings = getReportsCards(state.activeDashboardUUID, context);
        state.hasFiltersSet = selectedFilterValues && Object.values(selectedFilterValues).length > 0
        && Object.values(selectedFilterValues).some(sfv => !_.isNil(sfv) && !_.isEmpty(sfv));
    }
    return state;
}

function getViewName(standardReportCardType) {
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

class CustomDashboardActions {
    static getInitialState(context) {
        return {
            loading: false,
            reportCardSectionMappings: [],
            cardToCountResultMap: {},
            resultUpdatedAt: null,
            filtersPresent: false,
            hasFiltersSet: false,
            activeDashboardUUID: null,
            customDashboardFilters: []
        };
    }

    // loads dashboard without the data for cards
    static onLoad(state, action, context) {
        let newState = {...state};
        const dashboardService = context.get(CustomDashboardService);
        const dashboards = dashboardService.getDashboards(action.customDashboardType);
        newState.dashboards = dashboards;
        newState.activeDashboardUUID = _.get(_.head(dashboards), 'uuid');
        if (state.dashboardUUID !== newState.activeDashboardUUID) {
            newState.cardToCountResultMap = {};
        }

        return loadCurrentDashboardInfo(context, newState);
    }

    // loads dashboard without the data for cards
    static onDashboardChange(state, action, context) {
        let newState = {...state};
        if (action.dashboardUUID !== state.activeDashboardUUID) {
            newState.cardToCountResultMap = {};
        }
        newState.activeDashboardUUID = action.dashboardUUID;
        return loadCurrentDashboardInfo(context, newState);
    }

    // This action is responsible for loading data for multiple views. If any of the views have to be updated then this mega action has to be invoked and duplicating the callback implementation on the action. We have to break this action into smaller actions for each view. Starting with task here, which is why it invokes a different callback and the service doesn't handle task.
    static onCardPress(state, action, context) {
        const newState = {...state};
        const itemKey = action.reportCardUUID;
        const rcUUID = context.get(ReportCardService).getPlainUUIDFromCompositeReportCardUUID(action.reportCardUUID);
        const reportCard = context.get(EntityService).findByUUID(rcUUID, ReportCard.schema.name);
        const {selectedFilterValues} = context.get(CustomDashboardService).getDashboardData(state.activeDashboardUUID);
        const ruleInputArray = context.get(DashboardFilterService).toRuleInputObjects(state.activeDashboardUUID, selectedFilterValues);

        reportCard.itemKey = itemKey;
        if (reportCard.isStandardTaskType()) {
            action.goToTaskLists(reportCard.standardReportCardType.getTaskTypeType(), ruleInputArray);
        } else {
            const {result, status} = context.get(ReportCardService).getReportCardResult(reportCard, ruleInputArray);

            const standardReportCardType = reportCard.standardReportCardType;
            const viewName = getViewName(standardReportCardType);
            if (!_.isNil(result)) {
                setTimeout(() => action.onCustomRecordCardResults(result, status, viewName,
                    standardReportCardType && standardReportCardType.getApprovalStatusForType(), ruleInputArray, reportCard), 0);
            }
        }
        return newState;
    }

    static setFilterApplied(state, action, context) {
        return filterUpdated(context, state);
    }

    static setFilterCleared(state, action, context) {
        return filterUpdated(context, state);
    }

    // loads the dashboard report cards data
    static refreshCount(state, action, context) {
        const customDashboardService = context.get(CustomDashboardService);
        const customDashboardCacheService = context.get(CustomDashboardCacheService);
        const userInfoService = context.get(UserInfoService);
        const reportCardService = context.get(ReportCardService);

        const newState = {...state};

        const {selectedFilterValues} = customDashboardService.getDashboardData(state.activeDashboardUUID);
        newState.customDashboardFilters = selectedFilterValues;
        const userSettings = userInfoService.getUserSettingsObject();

        const I18n = context.get(MessageService).getI18n();
        const reportCardSectionMappings = state.reportCardSectionMappings;


        newState.cardToCountResultMap = {};

        const ruleInputArray = context.get(DashboardFilterService).toRuleInputObjects(state.activeDashboardUUID, selectedFilterValues);
        reportCardSectionMappings.forEach(rcm => {
            const start = new Date();
            const {dashboardCache} = customDashboardCacheService.getDashboardCache(state.activeDashboardUUID);
            if (rcm.card.nested) {
                let reportCardResults = dashboardCache.getNestedReportCardResults(rcm.card);
                let hasError = reportCardResults && reportCardResults.length !== rcm.card.countOfCards;
                if (userSettings.autoRefreshEnabled || _.isEmpty(reportCardResults)) {
                    reportCardResults = reportCardService.getReportCardCount(rcm.card, ruleInputArray);
                    if (!hasError)
                        customDashboardCacheService.updateNestedCardResults(state.activeDashboardUUID, rcm.card, reportCardResults);
                }

                if (reportCardResults && reportCardResults.length === rcm.card.countOfCards) {
                    _.forEach(reportCardResults, (reportCardResult, index) => {
                        const itemKey = rcm.card.getCardId(index);
                        newState.cardToCountResultMap[itemKey] = reportCardResult;
                    });
                } else if (hasError) {
                    rcm.card.createNestedErrorResults(I18n.t("Error"), I18n.t("nestedReportCardsCountMismatch")).forEach((result, index) => {
                        const itemKey = rcm.card.getCardId(index);
                        newState.cardToCountResultMap[itemKey] = result;
                    });
                }
            } else {
                let reportCardResult = dashboardCache.getReportCardResult(rcm.card);
                if (userSettings.autoRefreshEnabled || _.isNil(reportCardResult)) {
                    reportCardResult = reportCardService.getReportCardCount(rcm.card, ruleInputArray);
                    customDashboardCacheService.updateReportCardResult(state.activeDashboardUUID, rcm.card, reportCardResult);
                }
                newState.cardToCountResultMap[rcm.card.getCardId()] = reportCardResult;
            }
            General.logDebug('CustomDashboardActions', `${rcm.card.name} took ${new Date() - start} ms`);
        });
        const {dashboardCache} = customDashboardCacheService.getDashboardCache(state.activeDashboardUUID);
        newState.resultUpdatedAt = dashboardCache.updatedAt;
        return newState;
    }

    static loadIndicator(state, action) {
        const newState = {...state};
        newState.loading = action.loading;
        return newState;
    }

    static disableAutoRefreshValueUpdated(state, action, context) {
        if (!action.disabled) {
            const customDashboardService = context.get(CustomDashboardService);
            const allDashboards = customDashboardService.getAllDashboards();
            const customDashboardCacheService = context.get(CustomDashboardCacheService);
            customDashboardCacheService.clearAllDashboardResults(allDashboards);
        }
        return state;
    }

    static forceRefresh(state, action, context) {
        const customDashboardCacheService = context.get(CustomDashboardCacheService);
        customDashboardCacheService.clearResults(state.activeDashboardUUID);
        return state;
    }

    static clearCounts(state, action, context) {
        const newState = {...state};
        newState.cardToCountResultMap = {};
        return newState;
    }
}

// These are not reducers, just a code reuse mechanism
export function performCustomDashboardActionAndRefresh(dispatcher, actionName, payload) {
    dispatcher.dispatchAction(actionName, payload);
    setTimeout(() => dispatcher.dispatchAction(CustomDashboardActionNames.REFRESH_COUNT), 500);
}

export function performCustomDashboardActionAndClearRefresh(dispatcher, actionName, payload) {
    dispatcher.dispatchAction(actionName, payload);
    dispatcher.dispatchAction(CustomDashboardActionNames.CLEAR_COUNTS, payload);
    setTimeout(() => dispatcher.dispatchAction(CustomDashboardActionNames.REFRESH_COUNT), 500);
}


const ActionPrefix = 'CustomDashboard';

const CustomDashboardActionNames = {
    ON_LOAD: `${ActionPrefix}.ON_LOAD`,
    ON_DASHBOARD_CHANGE: `${ActionPrefix}.ON_DASHBOARD_CHANGE`,
    ON_CARD_PRESS: `${ActionPrefix}.ON_CARD_PRESS`,
    LOAD_INDICATOR: `${ActionPrefix}.LOAD_INDICATOR`,
    REFRESH_COUNT: `${ActionPrefix}.REFRESH_COUNT`,
    FILTER_APPLIED: `${ActionPrefix}.FILTER_APPLIED`,
    FILTER_CLEARED: `${ActionPrefix}.FILTER_CLEARED`,
    DISABLE_AUTO_REFRESH_VALUE_UPDATED: `${ActionPrefix}.DISABLE_AUTO_REFRESH_VALUE_UPDATED`,
    FORCE_REFRESH: `${ActionPrefix}.FORCE_REFRESH`,
    CLEAR_COUNTS: `${ActionPrefix}.CLEAR_COUNTS`
};

const CustomDashboardActionMap = new Map([
    [CustomDashboardActionNames.ON_LOAD, CustomDashboardActions.onLoad],
    [CustomDashboardActionNames.ON_DASHBOARD_CHANGE, CustomDashboardActions.onDashboardChange],
    [CustomDashboardActionNames.ON_CARD_PRESS, CustomDashboardActions.onCardPress],
    [CustomDashboardActionNames.LOAD_INDICATOR, CustomDashboardActions.loadIndicator],
    [CustomDashboardActionNames.REFRESH_COUNT, CustomDashboardActions.refreshCount],
    [CustomDashboardActionNames.FILTER_APPLIED, CustomDashboardActions.setFilterApplied],
    [CustomDashboardActionNames.FILTER_CLEARED, CustomDashboardActions.setFilterCleared],
    [CustomDashboardActionNames.DISABLE_AUTO_REFRESH_VALUE_UPDATED, CustomDashboardActions.disableAutoRefreshValueUpdated],
    [CustomDashboardActionNames.FORCE_REFRESH, CustomDashboardActions.forceRefresh],
    [CustomDashboardActionNames.CLEAR_COUNTS, CustomDashboardActions.clearCounts]
]);

export {CustomDashboardActionNames, CustomDashboardActionMap, CustomDashboardActions}
