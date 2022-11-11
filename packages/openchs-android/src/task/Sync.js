import {EntityMetaData} from "avni-models";
import SyncService from "../service/SyncService";
import General from "../utility/General";
import NetInfo from "@react-native-community/netinfo";
import BaseTask from "./BaseTask";
import ErrorHandler from "../utility/ErrorHandler";
import AuthenticationError, {NO_USER} from "../service/AuthenticationError";

class Sync extends BaseTask {
    async execute() {
        try {
            this.initDependencies();
            General.logInfo("Sync", "Starting SyncService");
            this.assertBeansPresent();
            General.logInfo("Sync", "Getting SyncService");
            let syncService = this.beans.getService(SyncService);
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
