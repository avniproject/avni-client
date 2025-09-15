import DeleteDrafts from "./task/DeleteDrafts";
import Sync from "./task/Sync";
import WorkManager from 'react-native-background-worker';
import General from "./utility/General";
import EnvironmentConfig from "./framework/EnvironmentConfig";

const SYNC_JOB_KEY = "syncJob";

const SyncJobSchedule = {
  jobKey: SYNC_JOB_KEY,
  timeout: 10,
  period: 60,
  persist: true,
  exact: true,
  job: async() => await Sync.execute()
};


const DeleteDraftsJobSchedule = {
  jobKey: "deleteDraftsJob",
  timeout: 10,
  period: 1 * 24 * 60,
  persist: true,
  exact: true,
  job: async() => await DeleteDrafts.execute()
};

//The jobs with identifier job keys are persisted. This is required for background jobs to persist over device restarts. If you are changing the job key then remember to cancel the job with the old job key.
export const RegisterAndScheduleJobs = function () {
    General.logDebug("AvniBackgroundJob", `Background job is ${EnvironmentConfig.autoSyncDisabled ? "disabled" : "enabled"}`);
  Schedule(DeleteDraftsJobSchedule)
    .then(() => General.logInfo("AvniBackgroundJob-DeleteDraftsJob", "Successfully scheduled"))
    .catch(err => General.logError("AvniBackgroundJob-DeleteDraftsJob", err));
  Schedule(SyncJobSchedule)
    .then(() => General.logInfo("AvniBackgroundJob-SyncJob", "Successfully scheduled"))
    .catch(err => General.logError("AvniBackgroundJob-SyncJob", err));
};

const Schedule = ({
                    jobKey,
                    timeout = 10, //maximum value is 10 minutes
                    period = 15, //minimum value is 15 minutes
                    notificationText = "Running in background...",
                    notificationTitle = "Background job",
                    job
                  }) => {
  let workflow = async() => await job();
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
