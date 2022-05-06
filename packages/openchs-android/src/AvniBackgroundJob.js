import DeleteDrafts from "./task/DeleteDrafts";
import PruneMedia from "./task/PruneMedia";
import Sync from "./task/Sync";
import General from "./utility/General";
import {AppRegistry, NativeModules, AppState} from 'react-native';
import _ from 'lodash';


const executeJob = async (func) => {
    if (AppState.currentState !== "active") {
        func()
    } else {
        _.noop()
    }
};

export const RegisterAndScheduleJobs = function () {
    AppRegistry.registerHeadlessTask('syncJob', () => () => executeJob(() => Sync.execute()));
    AppRegistry.registerHeadlessTask('deleteDraftsJob', () => () => executeJob(() => DeleteDrafts.execute()));
    AppRegistry.registerHeadlessTask('pruneMediaJob', () => () => executeJob(() => PruneMedia.execute()));

    NativeModules.AvniBackgroundJob.startService();
};

export const SetBackgroundTaskDependencies = function (db, beans) {
    General.logInfo("AvniBackgroundJob", "Setting context dependencies for tasks");
    DeleteDrafts.setDependencies(db, beans);
    PruneMedia.setDependencies(db, beans);
    Sync.setDependencies(db, beans);
};
