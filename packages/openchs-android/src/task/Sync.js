import {EntityMetaData} from "avni-models";
import SyncService from "../service/SyncService";
import General from "../utility/General";
import NetInfo from "@react-native-community/netinfo";
import BaseTask from "./BaseTask";
import ErrorHandler from "../utility/ErrorHandler";
import AuthenticationError, {NO_USER} from "../service/AuthenticationError";
import GlobalContext from "../GlobalContext";
import UserInfoService from "../service/UserInfoService";
import _ from "lodash";
import SettingsService from '../service/SettingsService';
import EnvironmentConfig from "../framework/EnvironmentConfig";
import {SyncActionNames as SyncActions} from '../action/SyncActions';
import moment from 'moment';

function dispatchAction(action, params) {
    const type = action instanceof Function ? action.Id : action;
    if (General.canLog(General.LogLevel.Debug))
        General.logDebug('BaseService', `Dispatching action: ${JSON.stringify(type)}`);
    return GlobalContext.getInstance().reduxStore.dispatch({type, ...params});
}

class Sync extends BaseTask {
    async execute() {

        try {
            General.logInfo("Sync", "Starting background sync");
            const globalContext = GlobalContext.getInstance();
            let settings = globalContext.beanRegistry.getService(SettingsService).getSettings();
            if (_.isNil(settings.userId)) {
                General.logInfo("Sync", "Skipping sync since idpType not set");
                return false;
            }
            let isAutoSyncDisabled = globalContext.beanRegistry.getService(UserInfoService).getUserSettingsObject().disableAutoSync;
            if (isAutoSyncDisabled || EnvironmentConfig.autoSyncDisabled) {
                General.logInfo("Sync", "Skipping auto-sync since it is disabled");
                return false;
            }
            await this.initDependencies();

            if(!this.wasLastCompletedSyncDoneMoreThanHalfAnHourAgo(globalContext)) {
                General.logInfo("Sync", 'Skipping auto-sync since we had recently synced within the last half an hour');
                return false;
            }

            General.logInfo("Sync", "Starting SyncService");
            General.logInfo("Sync", "Getting SyncService");
            const syncService = globalContext.beanRegistry.getService("syncService");

            dispatchAction(SyncActions.ON_BACKGROUND_SYNC_STATUS_CHANGE, {backgroundSyncInProgress: true});
            General.logInfo("Sync", "Getting connection info");
            let connectionInfo;
            await NetInfo.fetch().then((state) => connectionInfo = state);
            General.logInfo("Sync", "Calling syncService.sync");
            return syncService.sync(EntityMetaData.model(), (progress) => {
                  General.logInfo("Sync", progress);
              },
              (message) => {
              }, connectionInfo, Date.now(), SyncService.syncSources.ONLY_UPLOAD_BACKGROUND_JOB, null)
              .then(this.performPostBackgroundSyncActions(globalContext))
              .catch((e) => {
                  ErrorHandler.postScheduledJobError(e);
              });
        } catch (e) {
            if (e instanceof AuthenticationError && e.code === NO_USER) {
                return;
            }
            ErrorHandler.postScheduledJobError(e);
        } finally {
            dispatchAction(SyncActions.ON_BACKGROUND_SYNC_STATUS_CHANGE, {backgroundSyncInProgress: false});
        }
    }

    wasLastCompletedSyncDoneMoreThanHalfAnHourAgo(globalContext) {
        const syncTelemetryService = globalContext.beanRegistry.getService("syncTelemetryService");
        const lastSynced = syncTelemetryService.getAllCompletedSyncsSortedByDescSyncEndTime();
        return _.isEmpty(lastSynced) || moment(lastSynced[0].syncEndTime).add(30, 'minutes').isBefore(moment());
    }

    performPostBackgroundSyncActions(globalContext) {
        return (updatedSyncSource) => {
            General.logInfo("Sync", "Background Sync completed")
            globalContext.beanRegistry.getService(SyncService).resetServicesAfterFullSyncCompletion(updatedSyncSource);
        };
    }
}

export default new Sync();
