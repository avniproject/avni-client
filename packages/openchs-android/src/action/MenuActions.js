import UserInfoService from "../service/UserInfoService";
import SettingsService from "../service/SettingsService";
import BackupRestoreRealmService from "../service/BackupRestoreRealm";
import SyncTelemetryService from "../service/SyncTelemetryService";
import EntitySyncStatusService from "../service/EntitySyncStatusService";
import General from "../utility/General";
import MenuItemService from "../service/application/MenuItemService";
import {MenuItem} from "openchs-models";
import RuleEvaluationService from "../service/RuleEvaluationService";
import AnonymizeRealmService from "../service/AnonymizeRealmService";

class MenuActions {
    static getInitialState() {
        return {
            userInfo: null,
            serverURL: null,
            backupInProgress: false,
            backupProgressUserMessage: '',
            percentDone: 0,
            oneSyncCompleted: false,
            unsyncedTxData: false,
            configuredMenuItems: [],
            configuredMenuItemRuleOutput: new Map()
        }
    }

    static onLoad(state, action, context) {
        const settings = context.get(SettingsService).getSettings();
        let newState = MenuActions.clone(state);
        newState.userInfo = context.get(UserInfoService).getUserInfo();
        newState.serverURL = settings.serverURL;

        newState.oneSyncCompleted = context.get(SyncTelemetryService).atLeastOneSyncCompleted();
        const entitySyncStatusService = context.get(EntitySyncStatusService);
        const totalPending = entitySyncStatusService.getTotalEntitiesPending();
        newState.unsyncedTxData = totalPending !== 0;

        newState.configuredMenuItems = context.get(MenuItemService).getAllMenuItems();
        return newState;
    }

    static clone(state) {
        return {...state};
    }

    static onBackupDump(state, action, context) {
        let newState = MenuActions.clone(state);
        const {organisationName, username} = state.userInfo;
        let backupAndRestoreRealmService = context.get(BackupRestoreRealmService);
        backupAndRestoreRealmService.backup(action.dumpType, (percentage, message) => {
            General.logDebug("MenuActions.onBackupDump", message);
            action.onBackupDumpCb(percentage, message);
        });
        newState.backupInProgress = true;
        newState.backupProgressUserMessage = "backupStarting";
        newState.percentDone = 1;
        return newState;
    }

    static onBackupProgress(state, action) {
        let newState = MenuActions.clone(state);
        newState.percentDone = action.percentDone;
        newState.backupProgressUserMessage = action.message;
        newState.backupInProgress = action.percentDone !== 100;
        return newState;
    }

    static onAnonymizeDatabase(state, action, context) {
        let newState = MenuActions.clone(state);
        let anonymizeRealmService = context.get(AnonymizeRealmService);
        anonymizeRealmService.copyAndAnonymizeDatabase((percent, message)=> {
            General.logDebug("MenuActions.onAnonymizeDatabase", `${percent}% done. ${message}`)
        })
        return newState;
    }
}

const ActionPrefix = 'Menu';

const MenuActionNames = {
    ON_LOAD: `${ActionPrefix}.ON_LOAD`,
    ON_BACKUP_DUMP: `${ActionPrefix}.ON_BACKUP_DUMP`,
    ON_BACKUP_PROGRESS: `${ActionPrefix}.ON_BACKUP_PROGRESS`,
    ON_ANONYMIZE_DB: `${ActionPrefix}.ON_ANONYMIZE_DB`,
    ON_ANONYMIZE_PROGRESS: `${ActionPrefix}.ON_ANONYMIZE_PROGRESS`
};

const MenuActionMap = new Map([
    [MenuActionNames.ON_LOAD, MenuActions.onLoad],
    [MenuActionNames.ON_BACKUP_DUMP, MenuActions.onBackupDump],
    [MenuActionNames.ON_BACKUP_PROGRESS, MenuActions.onBackupProgress],
    [MenuActionNames.ON_ANONYMIZE_DB, MenuActions.onAnonymizeDatabase]
]);

export {MenuActions, MenuActionNames, MenuActionMap}
