import DeleteDrafts from "./task/DeleteDrafts";
import PruneMedia from "./task/PruneMedia";
import Sync from "./task/Sync";
import WorkManager from 'react-native-background-worker';
import General from "./utility/General";

const SyncJobSchedule = {
  jobKey: "syncJob",
  timeout: 10,
  period: 60,
  persist: true,
  exact: true,
  job: () => Sync.execute()
};

const DeleteDraftsJobSchedule = {
  jobKey: "deleteDraftsJob",
  timeout: 10,
  period: 1 * 24 * 60, //TODO revert this and delete below line before code push
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

export const SetBackgroundTaskDependencies = function (db, beans) {
  General.logInfo("AvniBackgroundJob", "Setting context dependencies for tasks");
  DeleteDrafts.setDependencies(db, beans);
  PruneMedia.setDependencies(db, beans);
  Sync.setDependencies(db, beans);
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
    repeatInterval: period
  });
}
