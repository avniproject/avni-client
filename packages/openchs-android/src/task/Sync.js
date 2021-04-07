import {EntityMetaData, Schema, SyncError} from "avni-models";
import SyncService from "../service/SyncService";
import General from "../utility/General";
import {NetInfo} from "react-native";
import BaseTask from "./BaseTask";
import ErrorHandler from "../utility/ErrorHandler";
import AuthenticationError, {NO_USER} from "../service/AuthenticationError";

class Sync extends BaseTask {
    async execute() {
        try {
            this.assertBeansPresent();
            General.logInfo("Sync", "Getting SyncService");
            let syncService = this.beans.get(SyncService);
            General.logInfo("Sync", "Getting connection info");
            const connectionInfo = await NetInfo.getConnectionInfo();
            General.logInfo("Sync", "Calling syncService.sync");
            return syncService.sync(EntityMetaData.model(), (progress) => {
                    General.logInfo("Sync", progress);
                },
                (message) => {
                }, connectionInfo, Date.now()).then(() => General.logInfo("Sync", "Sync completed")).catch((e) => {
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