import DeleteDrafts from "./task/DeleteDrafts";
import DummySync from "./task/DummySync";
import PruneMedia from "./task/PruneMedia";
import Sync from "./task/Sync";
import WorkManager from 'react-native-background-worker';
import General from "./utility/General";
import AppConfig from "./framework/AppConfig";

const SYNC_JOB_KEY = "syncJob"; //Should be used for both SyncJobSchedule and DummySyncJobSchedule, so that one replaces another when scheduled

const SyncJobSchedule = {
  jobKey: SYNC_JOB_KEY,
  timeout: 10,
  period: 60,
  persist: true,
  exact: true,
  job: () => {
      if (!AppConfig.autoSyncDisabled)
        Sync.execute();
      else
          General.logDebug("AvniBackgroundJob", "Background job is disabled");
  }
};

const DummySyncJobSchedule = {
  jobKey: SYNC_JOB_KEY,
  timeout: 10,
  period: 60,
  persist: true,
  exact: true,
  job: () => DummySync.execute()
};

const DeleteDraftsJobSchedule = {
  jobKey: "deleteDraftsJob",
  timeout: 10,
  period: 1 * 24 * 60,
  persist: true,
  exact: true,
  job: () => DeleteDrafts.execute()
};

const PruneMediaJobSchedule = {
  jobKey: "pruneMediaJob",
  timeout: 10,
  period: 1 * 24 * 60,
  persist: true,
  exact: true,
  job: () => PruneMedia.execute()
};

//The jobs with identifier job keys are persisted. This is required for background jobs to persist over device restarts. If you are changing the job key then remember to cancel the job with the old job key.
export const RegisterAndScheduleJobs = function () {
    General.logDebug("AvniBackgroundJob", `Background job is ${AppConfig.autoSyncDisabled ? "disabled" : "enabled"}`);
  Schedule(DeleteDraftsJobSchedule)
    .then(() => General.logInfo("AvniBackgroundJob-DeleteDraftsJob", "Successfully scheduled"))
    .catch(err => General.logError("AvniBackgroundJob-DeleteDraftsJob", err));
  Schedule(PruneMediaJobSchedule)
    .then(() => General.logInfo("AvniBackgroundJob-PruneMediaJob", "Successfully scheduled"))
    .catch(err => General.logError("AvniBackgroundJob-PruneMediaJob", err));
  Schedule(SyncJobSchedule)
    .then(() => General.logInfo("AvniBackgroundJob-SyncJob", "Successfully scheduled"))
    .catch(err => General.logError("AvniBackgroundJob-SyncJob", err));
};

export const ScheduleDummySyncJob = function () {
  return Schedule(DummySyncJobSchedule)
    .then(() => General.logInfo("AvniBackgroundJob-DummySyncJob", "Successfully scheduled dummy to replace syncJob"))
    .catch(err => General.logError("AvniBackgroundJob-DummySyncJob", err));
};

export const ScheduleSyncJob = function () {
  Schedule(SyncJobSchedule)
    .then(() => General.logInfo("AvniBackgroundJob-SyncJobSchedule", "Successfully scheduled"))
    .catch(err => General.logError("AvniBackgroundJob-SyncJobSchedule", err));
};

const Schedule = ({
                    jobKey,
                    timeout = 2000,
                    period,
                    notificationText = "Running in background...",
                    notificationTitle = "Background job",
                    job
                  }) => {
  let workflow = async() => job();
  return WorkManager.setWorker({
    type: 'periodic', //Since we want this to be re-triggered as per repeatInterval specification
    name: jobKey,
    notification: {
      title: notificationTitle,
      text: notificationText,
    },
    timeout,
    foregroundBehaviour: 'headlessTask', //Since this could take long time to run
    workflow,
    constraints: {
      network: "connected",
      battery: "notLow",
    },
    repeatInterval: period
  });
}
