// Uploading the catchment database publishes it for other devices to restore, so it must not
// go up carrying data this device has not reconciled (#2141).
export const BLOCKER_KEYS = {
    lastSyncIncomplete: 'uploadCatchmentDatabaseLocalOneSyncNeeded',
    unsavedData: 'uploadCatchmentDatabaseLocalUnsavedData',
    resetPending: 'uploadCatchmentDatabaseResetPending'
};

// Returns the reasons the upload must not proceed, empty when it may. Every input is read as
// "block unless proven otherwise": an absent argument is a reading that failed, not a pass.
export function catchmentUploadBlockers(state) {
    const {lastSyncCompleted, hasUnsyncedTxData, hasPendingReset} = state || {};
    const blockers = [];
    if (lastSyncCompleted !== true) blockers.push(BLOCKER_KEYS.lastSyncIncomplete);
    if (hasUnsyncedTxData === true) blockers.push(BLOCKER_KEYS.unsavedData);
    if (hasPendingReset === true) blockers.push(BLOCKER_KEYS.resetPending);
    return blockers;
}
