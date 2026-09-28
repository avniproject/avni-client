import _ from "lodash";
import moment from "moment";
import General from "./General";
import {getConnectionInfo} from "./ConnectionInfo";
import SessionRecord, {SESSION_ESTABLISHED} from "../service/SessionRecord";

export const NO_USER_REASON = 'no_user';

const isBlank = (value) => _.isNil(value) || value === '';

export function buildForcedLoginPromptParams({errorCode, isConnected, lastCompletedSyncAt, tokenIssuedAt, clockDriftSeconds, idpType, now = Date.now()}) {
    const params = {
        error_code: isBlank(errorCode) ? 'unknown' : String(errorCode),
        // Firebase on Android drops a Boolean from an event bundle.
        is_connected: (!!isConnected).toString()
    };
    // Absent rather than null, so a missing reading stays distinguishable from a zero.
    if (_.isFinite(lastCompletedSyncAt)) params.minutes_since_last_sync = Math.round((now - lastCompletedSyncAt) / 60000);
    if (_.isFinite(tokenIssuedAt)) params.token_age_minutes = Math.round((now - tokenIssuedAt) / 60000);
    if (_.isFinite(clockDriftSeconds)) params.cognito_clock_drift_seconds = clockDriftSeconds;
    if (!isBlank(idpType)) params.idp_type = idpType;
    return params;
}

async function readQuietly(source, description) {
    try {
        return await source();
    } catch (e) {
        General.logWarn("ForcedLoginPrompt", `Could not read ${description}: ${e.message}`);
        return undefined;
    }
}

function lastCompletedSyncAt(lastSync) {
    const syncEndTime = _.get(lastSync, 'syncEndTime');
    if (_.isNil(syncEndTime)) return undefined;
    const at = moment(syncEndTime);
    return at.isValid() ? at.valueOf() : undefined;
}

export async function logForcedLoginPrompt(context, {errorCode}) {
    try {
        // Required lazily so the parameter builder stays importable without the service graph behind it.
        const {firebaseEvents, logEvent} = require("./Analytics");
        const SettingsService = require("../service/SettingsService").default;
        const SyncTelemetryService = require("../service/SyncTelemetryService").default;
        const AuthService = require("../service/AuthService").default;

        const [connection, syncedAt, liveClock, recordedClock, idpType] = await Promise.all([
            readQuietly(() => getConnectionInfo(), "connection"),
            readQuietly(() => lastCompletedSyncAt(context.getService(SyncTelemetryService).getLatestCompletedSync()), "last completed sync"),
            readQuietly(() => context.getService(AuthService).getAuthProviderService().getCachedSessionClockInfo(), "session clock info"),
            readQuietly(() => SessionRecord.getClock(), "recorded session clock"),
            readQuietly(() => context.getService(SettingsService).getSettings().idpType, "idpType")
        ]);
        // The SDK deletes its cached token when it drops the user, which is when this event is most needed.
        const clock = _.isEmpty(_.omitBy(liveClock, _.isNil)) ? (recordedClock || {}) : liveClock;

        logEvent(firebaseEvents.FORCED_LOGIN_PROMPT, buildForcedLoginPromptParams({
            errorCode,
            isConnected: _.get(connection, 'isConnected'),
            lastCompletedSyncAt: syncedAt,
            tokenIssuedAt: clock.tokenIssuedAt,
            clockDriftSeconds: clock.clockDriftSeconds,
            idpType
        }));
    } catch (e) {
        General.logWarn("ForcedLoginPrompt", `Could not record forced login prompt: ${e.message}`);
    }
}

// A device upgraded from before the session record has no state; having synced is the best evidence it had a session.
export async function logForcedLoginPromptAtLaunch(context, {userExists, databaseSynced}) {
    try {
        const state = await SessionRecord.getState();
        if (userExists) {
            if (_.isNil(state)) await SessionRecord.established();
            return;
        }
        const lost = state === SESSION_ESTABLISHED || (_.isNil(state) && databaseSynced);
        if (!lost) return;
        // Ended before logging, so a user stuck on the login screen is counted once rather than on every launch.
        await SessionRecord.ended();
        await logForcedLoginPrompt(context, {errorCode: NO_USER_REASON});
    } catch (e) {
        General.logWarn("ForcedLoginPrompt", `Could not record forced login prompt at launch: ${e.message}`);
    }
}
