import DeleteDrafts from "./task/DeleteDrafts";
import PruneMedia from "./task/PruneMedia";
import Sync from "./task/Sync";
import {Schema} from "avni-models";
import BackgroundJob from 'react-native-background-job';
import General from "./utility/General";

const SyncJob = {
    jobKey: "syncJob",
    job: () => Sync.execute()
};

const DeleteDraftsJob = {
    jobKey: "deleteDraftsJob",
    job: () => DeleteDrafts.execute()
};

const PruneMediaJob = {
    jobKey: "pruneMediaJob",
    job: () => PruneMedia.execute()
};

const SyncJobSchedule = {
    jobKey: "syncJob",
};

const DeleteDraftsJobSchedule = {
    jobKey: "deleteDraftsJob",
};

const PruneMediaJobSchedule = {
    jobKey: "pruneMediaJob",
};

export const RegisterAndScheduleJobs = function () {
    BackgroundJob.register(DeleteDraftsJob);
    BackgroundJob.register(PruneMediaJob);
    BackgroundJob.register(SyncJob);

    BackgroundJob.schedule(DeleteDraftsJobSchedule)
        .then(() => console.log("Success"))
        .catch(err => console.error(err));
    BackgroundJob.schedule(PruneMediaJobSchedule)
        .then(() => console.log("Success"))
        .catch(err => console.error(err));
    BackgroundJob.schedule(SyncJobSchedule)
        .then(() => console.log("Success"))
        .catch(err => console.error(err));
};

export const SetBackgroundTaskDependencies = function (db, beans) {
    General.logInfo("AvniBackgroundJob", "Setting context dependencies for tasks");
    DeleteDrafts.setDependencies(db, beans);
    PruneMedia.setDependencies(db, beans);
    Sync.setDependencies(db, beans);
};