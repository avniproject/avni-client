import DeleteDrafts from "./task/DeleteDrafts";
import PruneMedia from "./task/PruneMedia";
import Sync from "./task/Sync";
import BackgroundJob from 'react-native-background-job';
import General from "./utility/General";
import {NativeModules, AppRegistry, NativeAppEventEmitter, AppState} from 'react-native';
import BatchedBridge from "react-native/Libraries/BatchedBridge/BatchedBridge";
const registeredWorkers = new Map();


export class ExposedToJava {
    test() {
        console.log("==================== this is just a test =========================");
    }
}

const exposedToJava = new ExposedToJava();
BatchedBridge.registerCallableModule("JavaScriptVisibleToJava", exposedToJava);


// function setWorker(worker) {
//     const {workflow, constraints, notification, ..._worker} = worker;
//     const workerConfiguration = {..._worker, ...notification};
//
//     const work = async (data: { id: string, payload: string }) => {
//         try {
//             await worker.workflow();
//             NativeModules.BackgroundWorker.result(data.id, JSON.stringify(null), "success")
//         } catch (error) {
//             NativeModules.BackgroundWorker.result(data.id, JSON.stringify(error), "failure")
//         }
//     };
//
//     if (registeredWorkers.has(worker.name)) {
//         registeredWorkers.get(worker.name)?.remove();
//         registeredWorkers.delete(worker.name)
//     }
//
//     AppRegistry.registerHeadlessTask(worker.name, () => work);
//
//     const subscription = NativeAppEventEmitter.addListener(worker.name, (data) => {
//         console.log("AppState.currentState =>>>++++", AppState.currentState);
//         if (AppState.currentState === "active") {
//             if (workerConfiguration.foregroundBehaviour === "blocking") {
//                 NativeModules.BackgroundWorker.result(data.id, JSON.stringify(null), "retry");
//                 return;
//             }
//             if (workerConfiguration.foregroundBehaviour === "foreground") {
//                 work(data);
//                 return;
//             }
//         }
//         NativeModules.BackgroundWorker.startHeadlessTask({...workerConfiguration, ...data})
//
//     });
//
//     registeredWorkers.set(worker.name, subscription);
//
//     return NativeModules.BackgroundWorker.registerWorker(workerConfiguration, constraints || {})
//
// }

export const RegisterAndScheduleJobs = function () {
    console.log("RegisterAndScheduleJobs--------------------");

    NativeModules.BackgroundWorker.registerWorker({name: 'worker1',
        title: 'Notification Title',
        text: 'Notification Text',
        repeatInterval: 15,
    }, {}).then((id) => General.logInfo("AvniBackgroundJob-DeleteDraftsJob", id))
    // setWorker({
    //     name: 'worker1',
    //     foregroundBehaviour: "foreground",
    //     notification: {
    //         title: 'Notification Title',
    //         text: 'Notification Text',
    //     },
    //     workflow: () => {
    //         console.log("startign the work 1 ============");
    //     },
    //     repeatInterval: 15,
    // })
    //     .then((id) => General.logInfo("AvniBackgroundJob-DeleteDraftsJob", id))
    //     .catch(err => General.logError("AvniBackgroundJob-DeleteDraftsJob", err));
    //
    // setWorker({
    //     name: 'worker2',
    //     foregroundBehaviour: "blocking",
    //     notification: {
    //         title: 'Notification Title',
    //         text: 'Notification Text',
    //     },
    //     workflow: () => {
    //         console.log("startign the work 2 ============");
    //     },
    //     repeatInterval: 16,
    // })
    //     .then((id) => General.logInfo("AvniBackgroundJob-DeleteDraftsJob", id))
    //     .catch(err => General.logError("AvniBackgroundJob-DeleteDraftsJob", err));

    // NativeModules.BackgroundWorker.registerWorker({
    //     type: 'periodic',
    //     name: 'worker2',
    //     timeout: 1,
    //     title: 'Notification Title',
    //     text: 'Notification Text',
    //     workflow: async () => {
    //         console.log("this is second job running ==========");
    //     },
    //     repeatInterval: 16,
    // }, {}).then((id) => General.logInfo("AvniBackgroundJob-DeleteDraftsJob", id))
    //     .catch(err => General.logError("AvniBackgroundJob-DeleteDraftsJob", err));
    // BackgroundJob.register(DeleteDraftsJob);
    // BackgroundJob.register(PruneMediaJob);
    // BackgroundJob.register(SyncJob);
    //
    // BackgroundJob.schedule(DeleteDraftsJobSchedule)
    //     .then(() => General.logInfo("AvniBackgroundJob-DeleteDraftsJob", "Successfully scheduled"))
    //     .catch(err => General.logError("AvniBackgroundJob-DeleteDraftsJob", err));
    // BackgroundJob.schedule(PruneMediaJobSchedule)
    //     .then(() => General.logInfo("AvniBackgroundJob-PruneMediaJob", "Successfully scheduled"))
    //     .catch(err => General.logError("AvniBackgroundJob-PruneMediaJob", err));
    // BackgroundJob.schedule(SyncJobSchedule)
    //     .then(() => General.logInfo("AvniBackgroundJob-SyncJob", "Successfully scheduled"))
    //     .catch(err => General.logError("AvniBackgroundJob-SyncJob", err));
};

export const SetBackgroundTaskDependencies = function (db, beans) {
    General.logInfo("AvniBackgroundJob", "Setting context dependencies for tasks");
    DeleteDrafts.setDependencies(db, beans);
    PruneMedia.setDependencies(db, beans);
    Sync.setDependencies(db, beans);
};
