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
    timeout: 10*60*1000,
    // period: 60*60*1000,
    persist: true
};

const DeleteDraftsJobSchedule = {
    jobKey: "deleteDraftsJob",
    timeout: 1*60*1000,
    period: 1*24*60*60*1000,
    persist: true
};

const PruneMediaJobSchedule = {
    jobKey: "pruneMediaJob",
    timeout: 1*60*1000,
    period: 1*24*60*60*1000,
    persist: true
};

//The jobs with identifier job keys are persisted. This is required for background jobs to persist over device restarts. If you are changing the job key then remember to cancel the job with the old job key.
export const RegisterAndScheduleJobs = function () {
    BackgroundJob.register(DeleteDraftsJob);
    BackgroundJob.register(PruneMediaJob);
    BackgroundJob.register(SyncJob);

    BackgroundJob.schedule(DeleteDraftsJobSchedule)
        .then(() => General.logInfo("AvniBackgroundJob-DeleteDraftsJob", "Success"))
        .catch(err => General.logError("AvniBackgroundJob-DeleteDraftsJob", err));
    BackgroundJob.schedule(PruneMediaJobSchedule)
        .then(() => General.logInfo("AvniBackgroundJob-PruneMediaJob", "Success"))
        .catch(err => General.logError("AvniBackgroundJob-PruneMediaJob", err));
    BackgroundJob.schedule(SyncJobSchedule)
        .then(() => General.logInfo("AvniBackgroundJob-SyncJob", "Success"))
        .catch(err => General.logError("AvniBackgroundJob-SyncJob", err));
};

export const SetBackgroundTaskDependencies = function (db, beans) {
    General.logInfo("AvniBackgroundJob", "Setting context dependencies for tasks");
    DeleteDrafts.setDependencies(db, beans);
    PruneMedia.setDependencies(db, beans);
    Sync.setDependencies(db, beans);
};