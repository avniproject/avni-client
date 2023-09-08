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

class Sync extends BaseTask {
    async execute() {
        try {
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
            General.logInfo("Sync", "Starting SyncService");
            General.logInfo("Sync", "Getting SyncService");
            const syncService = globalContext.beanRegistry.getService("syncService");
            General.logInfo("Sync", "Getting connection info");
            let connectionInfo;
            await NetInfo.fetch().then((state) => connectionInfo = state);
            General.logInfo("Sync", "Calling syncService.sync");
            return syncService.sync(EntityMetaData.model(), (progress) => {
                    General.logInfo("Sync", progress);
                },
                (message) => {
                }, connectionInfo, Date.now(), SyncService.syncSources.ONLY_UPLOAD_BACKGROUND_JOB, null).then(() => General.logInfo("Sync", "Sync completed")).catch((e) => {
                ErrorHandler.postScheduledJobError(e);
            });
        } catch (e) {
            if (e instanceof AuthenticationError && e.code === NO_USER) {
                return;
            }
            ErrorHandler.postScheduledJobError(e);
        }
    }
}

export default new Sync();
