import _ from 'lodash';
import CustomDashboardService from "../../service/customDashboard/CustomDashboardService";
import DashboardSectionCardMappingService from "../../service/customDashboard/DashboardSectionCardMappingService";
import EntityService from "../../service/EntityService";
import {ReportCard} from "openchs-models";
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
    const loadInfoStartTime = new Date();
    General.logDebug('CustomDashboardActions', `loadCurrentDashboardInfo started for dashboard: ${state.activeDashboardUUID}`);
    
    const dashboardFilterService = context.get(DashboardFilterService);
    state.filtersPresent = dashboardFilterService.areFiltersPresent(state.activeDashboardUUID);
    const {selectedFilterValues, dashboardCache} = context.get(CustomDashboardService).getDashboardData(state.activeDashboardUUID);
    state.customDashboardFilters = selectedFilterValues;
    if (state.activeDashboardUUID) {
        const cardsStartTime = new Date();
        state.reportCardSectionMappings = getReportsCards(state.activeDashboardUUID, context);
        General.logDebug('CustomDashboardActions', `getReportsCards took ${new Date() - cardsStartTime} ms, found ${state.reportCardSectionMappings?.length || 0} cards`);
        state.hasFiltersSet = dashboardCache.filterApplied;
    }
    General.logDebug('CustomDashboardActions', `loadCurrentDashboardInfo completed in ${new Date() - loadInfoStartTime} ms`);
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
        const startTime = new Date();
        General.logDebug('CustomDashboardActions', `onLoad started - customDashboardType: ${action.customDashboardType}, currentActiveDashboard: ${state.activeDashboardUUID}`);
        let newState = {...state};
        const dashboardService = context.get(CustomDashboardService);
        const dashboards = dashboardService.getDashboards(action.customDashboardType);
        newState.dashboards = dashboards;
        newState.activeDashboardUUID = _.get(_.head(dashboards), 'uuid');
        if (state.dashboardUUID !== newState.activeDashboardUUID) {
            General.logDebug('CustomDashboardActions', `onLoad - Clearing cardToCountResultMap due to dashboard change: ${state.dashboardUUID} -> ${newState.activeDashboardUUID}`);
            newState.cardToCountResultMap = {};
        }

        if (newState.dashboards.length === 0) {
            General.logDebug('CustomDashboardActions', `onLoad completed - no dashboards found, took ${new Date() - startTime} ms`);
            return newState;
        }

        const result = loadCurrentDashboardInfo(context, newState);
        General.logDebug('CustomDashboardActions', `onLoad completed - activeDashboard: ${result.activeDashboardUUID}, took ${new Date() - startTime} ms`);
        return result;
    }

    // loads dashboard without the data for cards
    static onDashboardChange(state, action, context) {
        const startTime = new Date();
        General.logDebug('CustomDashboardActions', `onDashboardChange started - from: ${state.activeDashboardUUID}, to: ${action.dashboardUUID}`);
        let newState = {...state};
        if (action.dashboardUUID !== state.activeDashboardUUID) {
            General.logDebug('CustomDashboardActions', `onDashboardChange - Clearing cardToCountResultMap due to dashboard change: ${state.activeDashboardUUID} -> ${action.dashboardUUID}`);
            newState.cardToCountResultMap = {};
        }
        newState.activeDashboardUUID = action.dashboardUUID;
        const result = loadCurrentDashboardInfo(context, newState);
        General.logDebug('CustomDashboardActions', `onDashboardChange completed - activeDashboard: ${result.activeDashboardUUID}, took ${new Date() - startTime} ms`);
        return result;
    }

    // This action is responsible for loading data for multiple views. If any of the views have to be updated then this mega action has to be invoked and duplicating the callback implementation on the action. We have to break this action into smaller actions for each view. Starting with task here, which is why it invokes a different callback and the service doesn't handle task.
    static onCardPress(state, action, context) {
        const cardPressStartTime = new Date();
        General.logDebug('CustomDashboardActions', `onCardPress started - reportCardUUID: ${action.reportCardUUID}, activeDashboard: ${state.activeDashboardUUID}`);
        const newState = {...state};
        const itemKey = action.reportCardUUID;
        const rcUUID = context.get(ReportCardService).getPlainUUIDFromCompositeReportCardUUID(action.reportCardUUID);
        const reportCard = context.get(EntityService).findByUUID(rcUUID, ReportCard.schema.name);
        const {selectedFilterValues} = context.get(CustomDashboardService).getDashboardData(state.activeDashboardUUID);
        const ruleInputArray = context.get(DashboardFilterService).toRuleInputObjects(state.activeDashboardUUID, selectedFilterValues);

        reportCard.itemKey = itemKey;
        if (reportCard.isStandardTaskType()) {
            General.logDebug('CustomDashboardActions', `onCardPress - Navigating to task lists for ${reportCard.name}, took ${new Date() - cardPressStartTime} ms`);
            action.goToTaskLists(reportCard.standardReportCardType.getTaskTypeType(), ruleInputArray);
        } else {
            const resultStartTime = new Date();
            const {result, status} = context.get(ReportCardService).getReportCardResult(reportCard, ruleInputArray);
            General.logDebug('CustomDashboardActions', `onCardPress - getReportCardResult for ${reportCard.name} took ${new Date() - resultStartTime} ms`);

            const standardReportCardType = reportCard.standardReportCardType;
            const viewName = getViewName(standardReportCardType);
            if (!_.isNil(result)) {
                General.logDebug('CustomDashboardActions', `onCardPress - Setting timeout for navigation to ${viewName}`);
                setTimeout(() => action.onCustomRecordCardResults(result, status, viewName,
                    standardReportCardType && standardReportCardType.getApprovalStatusForType(), ruleInputArray, reportCard), 0);
            }
        }
        General.logDebug('CustomDashboardActions', `onCardPress completed for ${reportCard.name}, total time: ${new Date() - cardPressStartTime} ms`);
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
        const refreshStartTime = new Date();
        General.logDebug('CustomDashboardActions', `refreshCount started - activeDashboard: ${state.activeDashboardUUID}, dashboards: ${state.dashboards?.length || 0}`);
        const customDashboardService = context.get(CustomDashboardService);
        const customDashboardCacheService = context.get(CustomDashboardCacheService);
        const userInfoService = context.get(UserInfoService);
        const reportCardService = context.get(ReportCardService);

        const newState = {...state};

        if (_.isNil(newState.dashboards) || newState.dashboards.length === 0) {
            General.logDebug('CustomDashboardActions', `refreshCount aborted - no dashboards available`);
            return newState;
        }

        const {selectedFilterValues} = customDashboardService.getDashboardData(state.activeDashboardUUID);
        newState.customDashboardFilters = selectedFilterValues;
        const userSettings = userInfoService.getUserSettingsObject();

        const I18n = context.get(MessageService).getI18n();
        const reportCardSectionMappings = state.reportCardSectionMappings;


        const previousResultsCount = Object.keys(newState.cardToCountResultMap || {}).length;
        newState.cardToCountResultMap = {};
        General.logDebug('CustomDashboardActions', `refreshCount - Cleared ${previousResultsCount} previous results from cardToCountResultMap`);

        const filterProcessingStart = new Date();
        const ruleInputArray = context.get(DashboardFilterService).toRuleInputObjects(state.activeDashboardUUID, selectedFilterValues);
        General.logDebug('CustomDashboardActions', `Filter processing took ${new Date() - filterProcessingStart} ms, filters: ${selectedFilterValues?.length || 0}`);
        
        reportCardSectionMappings.forEach(rcm => {
            const start = new Date();
            const {dashboardCache} = customDashboardCacheService.getDashboardCache(state.activeDashboardUUID);
            if (rcm.card.nested) {
                const cacheCheckStart = new Date();
                let reportCardResults = dashboardCache.getNestedReportCardResults(rcm.card);
                let hasError = reportCardResults && reportCardResults.length !== rcm.card.countOfCards;
                const cacheHit = !_.isEmpty(reportCardResults);
                General.logDebug('CustomDashboardActions', `Nested card cache ${cacheHit ? 'HIT' : 'MISS'} for ${rcm.card.name}, autoRefresh: ${userSettings.autoRefreshEnabled}, hasError: ${hasError}, check took ${new Date() - cacheCheckStart} ms`);
                
                if (userSettings.autoRefreshEnabled || _.isEmpty(reportCardResults)) {
                    const countCalculationStart = new Date();
                    reportCardResults = reportCardService.getReportCardCount(rcm.card, ruleInputArray);
                    General.logDebug('CustomDashboardActions', `Nested card count calculation for ${rcm.card.name} took ${new Date() - countCalculationStart} ms`);
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
                const cacheCheckStart = new Date();
                let reportCardResult = dashboardCache.getReportCardResult(rcm.card);
                const cacheHit = !_.isNil(reportCardResult);
                General.logDebug('CustomDashboardActions', `Single card cache ${cacheHit ? 'HIT' : 'MISS'} for ${rcm.card.name}, autoRefresh: ${userSettings.autoRefreshEnabled}, check took ${new Date() - cacheCheckStart} ms`);
                
                if (userSettings.autoRefreshEnabled || _.isNil(reportCardResult)) {
                    const countCalculationStart = new Date();
                    reportCardResult = reportCardService.getReportCardCount(rcm.card, ruleInputArray);
                    General.logDebug('CustomDashboardActions', `Single card count calculation for ${rcm.card.name} took ${new Date() - countCalculationStart} ms`);
                    customDashboardCacheService.updateReportCardResult(state.activeDashboardUUID, rcm.card, reportCardResult);
                }
                newState.cardToCountResultMap[rcm.card.getCardId()] = reportCardResult;
            }
            General.logDebug('CustomDashboardActions', `${rcm.card.name} took ${new Date() - start} ms`);
        });
        const {dashboardCache} = customDashboardCacheService.getDashboardCache(state.activeDashboardUUID);
        newState.resultUpdatedAt = dashboardCache.updatedAt;
        newState.hasFiltersSet = dashboardCache.filterApplied;
        
        General.logDebug('CustomDashboardActions', `refreshCount completed - processed ${reportCardSectionMappings.length} cards, took ${new Date() - refreshStartTime} ms`);
        return newState;
    }

    static loadIndicator(state, action) {
        const newState = {...state};
        newState.loading = action.loading;
        return newState;
    }

    static disableAutoRefreshValueUpdated(state, action, context) {
        General.logDebug('CustomDashboardActions', `Auto-refresh setting changed - disabled: ${action.disabled}`);
        if (!action.disabled) {
            const customDashboardService = context.get(CustomDashboardService);
            const allDashboards = customDashboardService.getAllDashboards();
            const customDashboardCacheService = context.get(CustomDashboardCacheService);
            General.logDebug('CustomDashboardActions', `Clearing all dashboard cache for ${allDashboards.length} dashboards due to auto-refresh enable`);
            customDashboardCacheService.clearAllDashboardResults(allDashboards);
        }
        return state;
    }

    static forceRefresh(state, action, context) {
        General.logDebug('CustomDashboardActions', `Force refresh triggered for dashboard: ${state.activeDashboardUUID}`);
        const customDashboardCacheService = context.get(CustomDashboardCacheService);
        customDashboardCacheService.clearResults(state.activeDashboardUUID);
        return state;
    }

    static clearCounts(state, action, context) {
        const newState = {...state};
        const customDashboardService = context.get(CustomDashboardService);

        if (newState.dashboards.length === 0) {
            return newState;
        }

        const {selectedFilterValues, dashboardCache} = customDashboardService.getDashboardData(state.activeDashboardUUID);
        newState.customDashboardFilters = selectedFilterValues;
        newState.hasFiltersSet = dashboardCache.filterApplied;
        const previousResultsCount = Object.keys(newState.cardToCountResultMap || {}).length;
        newState.cardToCountResultMap = {};
        General.logDebug('CustomDashboardActions', `clearCounts - Cleared ${previousResultsCount} results from cardToCountResultMap`);
        return newState;
    }
}

// Debounce refresh calls to prevent duplicates
let refreshTimeout = null;
function scheduleRefresh(dispatcher) {
    const wasAlreadyScheduled = refreshTimeout !== null;
    if (refreshTimeout) {
        General.logDebug('CustomDashboardActions', 'scheduleRefresh - Canceling previous scheduled refresh');
        clearTimeout(refreshTimeout);
    }
    General.logDebug('CustomDashboardActions', `scheduleRefresh - Scheduling refresh in 500ms${wasAlreadyScheduled ? ' (was already scheduled)' : ''}`);
    refreshTimeout = setTimeout(() => {
        try {
            General.logDebug('CustomDashboardActions', 'scheduleRefresh - Executing scheduled refresh');
            dispatcher.dispatchAction(CustomDashboardActionNames.REFRESH_COUNT);
        } catch (error) {
            General.logError('CustomDashboardActions', `Refresh count failed: ${error.message}`);
        } finally {
            refreshTimeout = null;
            General.logDebug('CustomDashboardActions', 'scheduleRefresh - Refresh completed, timeout cleared');
        }
    }, 500);
}

// These are not reducers, just a code reuse mechanism
export function performCustomDashboardActionAndRefresh(dispatcher, actionName, payload) {
    General.logDebug('CustomDashboardActions', `performCustomDashboardActionAndRefresh - Action: ${actionName}`);
    dispatcher.dispatchAction(actionName, payload);
    scheduleRefresh(dispatcher);
}

export function performCustomDashboardActionAndClearRefresh(dispatcher, actionName, payload) {
    General.logDebug('CustomDashboardActions', `performCustomDashboardActionAndClearRefresh - Action: ${actionName}`);
    dispatcher.dispatchAction(actionName, payload);
    dispatcher.dispatchAction(CustomDashboardActionNames.CLEAR_COUNTS);
    scheduleRefresh(dispatcher);
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
