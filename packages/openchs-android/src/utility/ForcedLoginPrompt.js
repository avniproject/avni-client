import _ from "lodash";
import General from "./General";

export const NO_USER_REASON = 'no_user';

export function buildForcedLoginPromptParams({errorCode, isConnected, lastCompletedSyncAt, tokenIssuedAt, clockDriftSeconds, idpType, now = Date.now()}) {
    const params = {
        error_code: _.isEmpty(errorCode) ? 'unknown' : errorCode,
        is_connected: !!isConnected
    };
    // Absent rather than null: a missing reading and a reading of zero mean different things here,
    // and a null would make the two indistinguishable once the events are aggregated.
    if (_.isFinite(lastCompletedSyncAt)) params.minutes_since_last_sync = Math.round((now - lastCompletedSyncAt) / 60000);
    if (_.isFinite(tokenIssuedAt)) params.token_age_minutes = Math.round((now - tokenIssuedAt) / 60000);
    if (_.isFinite(clockDriftSeconds)) params.cognito_clock_drift_seconds = clockDriftSeconds;
    if (!_.isEmpty(idpType)) params.idp_type = idpType;
    return params;
}

export function logForcedLoginPrompt(context, {errorCode, isConnected}) {
    try {
        // Required lazily so the parameter builder above stays importable without dragging the
        // service graph in behind it.
        const {firebaseEvents, logEvent} = require("./Analytics");
        const SettingsService = require("../service/SettingsService").default;
        const SyncTelemetryService = require("../service/SyncTelemetryService").default;
        const AuthService = require("../service/AuthService").default;

        const lastSync = context.getService(SyncTelemetryService).getLatestCompletedSync();
        const clock = context.getService(AuthService).getAuthProviderService().getCachedSessionClockInfo();
        logEvent(firebaseEvents.FORCED_LOGIN_PROMPT, buildForcedLoginPromptParams({
            errorCode,
            isConnected,
            lastCompletedSyncAt: _.get(lastSync, 'syncEndTime') && lastSync.syncEndTime.getTime(),
            tokenIssuedAt: clock.tokenIssuedAt,
            clockDriftSeconds: clock.clockDriftSeconds,
            idpType: context.getService(SettingsService).getSettings().idpType
        }));
    } catch (e) {
        General.logWarn("ForcedLoginPrompt", `Could not record forced login prompt: ${e.message}`);
    }
}
