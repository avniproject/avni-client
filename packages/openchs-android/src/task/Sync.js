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
import RuleEvaluationService from '../service/RuleEvaluationService';
import ProgramConfigService from '../service/ProgramConfigService';
import MessageService from '../service/MessageService';
import RuleService from '../service/RuleService';
import PrivilegeService from '../service/PrivilegeService';
import {IndividualSearchActionNames as IndividualSearchActions} from '../action/individual/IndividualSearchActions';
import {LandingViewActions} from '../action/LandingViewActions';
import moment from 'moment';

class Sync extends BaseTask {
    async execute() {
        const dispatchAction = (action, params) => {
            const type = action instanceof Function ? action.Id : action;
            if (General.canLog(General.LogLevel.Debug))
                General.logDebug('BaseService', `Dispatching action: ${JSON.stringify(type)}`);
            return GlobalContext.getInstance().reduxStore.dispatch({type, ...params});
        }

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
              .then(this.performPostBackgroundSyncActions(dispatchAction, globalContext))
              .catch((e) => {
                  ErrorHandler.postScheduledJobError(e);
              });
        } catch (e) {
            if (e instanceof AuthenticationError && e.code === NO_USER) {
                return;
            }
            ErrorHandler.postScheduledJobError(e);
        }
    }

    wasLastCompletedSyncDoneMoreThanHalfAnHourAgo(globalContext) {
        const syncTelemetryService = globalContext.beanRegistry.getService("syncTelemetryService");
        const lastSynced = syncTelemetryService.getAllCompletedSyncsSortedByDescSyncEndTime();
        return _.isEmpty(lastSynced) || moment(lastSynced[0].syncEndTime).add(30, 'minutes').isBefore(moment());
    }

    performPostBackgroundSyncActions(dispatchAction, globalContext) {
        return (updatedSyncSource) => {
            General.logInfo("Sync", "Sync completed")
            dispatchAction(SyncActions.ON_BACKGROUND_SYNC_STATUS_CHANGE, {backgroundSyncInProgress: false});
            if (updatedSyncSource === SyncService.syncSources.BACKGROUND_JOB) {
                General.logInfo("Background Sync", "Full Background Sync completed, performing reset")
                setTimeout(() => {
                    globalContext.beanRegistry.getService(RuleEvaluationService).init();
                    globalContext.beanRegistry.getService(ProgramConfigService).init();
                    globalContext.beanRegistry.getService(MessageService).init();
                    globalContext.beanRegistry.getService(RuleService).init();
                    globalContext.beanRegistry.getService(PrivilegeService).deleteRevokedEntities();
                    //To load subjectType after sync
                    globalContext.beanRegistry.getService(IndividualSearchActions.ON_LOAD);

                    //To re-render LandingView after sync
                    dispatchAction(LandingViewActions.ON_LOAD, {syncRequired: false});
                }, 1);
                globalContext.beanRegistry.getService(SettingsService).initLanguages();
                General.logInfo("Background Sync", 'Background Sync completed, reset completed');
            }
        };
    }
}

export default new Sync();
