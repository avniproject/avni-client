import {Alert, AppState} from "react-native";
import _ from "lodash";
import General from "../../utility/General";

const TRANSLATED_ERRORS = ['key', 'stale', 'setup', 'timeout', 'closed', 'hubNeedsAndroid10', 'badCode', 'joinFailed',
    'cannotReadNetwork', 'wrongNetwork', 'hubNotFound', 'joinInProgress', 'rejoinFailed', 'hotspotStopped',
    'hotspotFailed', 'locationOff', 'hotspotNotAllowed', 'wifiOff'];

// Without a log, phones the hub refuses leave no trace.
export const hubLog = (message) => General.logInfo('ClinicHub', message);

export function clinicSharingErrorText(I18n, error) {
    const code = _.get(error, 'code');
    const details = _.get(error, 'details', {});
    if (code === 'setup') return I18n.t('clinicSharingError_setup', {types: _.get(details, 'types', []).join(', ')});
    if (_.includes(TRANSLATED_ERRORS, code)) return I18n.t(`clinicSharingError_${code}`, details);
    return I18n.t('clinicSharingErrorOther', {message: _.get(error, 'message', '')});
}

// These reasons already end with what to do, so the alert adds nothing to them.
const SAYS_WHAT_TO_DO = ['hotspotFailed', 'locationOff', 'hotspotNotAllowed', 'hotspotStopped', 'hubNeedsAndroid10'];
// The app comes back to the screen often, so each reason is told once until the hub starts again.
let toldReason = null;

// A hub phone that restarted carries on its camp as soon as the app opens; when it cannot, Home says why.
export async function resumeClinicCamp(hubService, I18n) {
    try {
        if (await hubService.resumeCamp(hubLog)) toldReason = null;
    } catch (error) {
        General.logError('ClinicSharing', error);
        const code = _.get(error, 'code') || 'other';
        if (toldReason === code) return;
        toldReason = code;
        const key = _.includes(SAYS_WHAT_TO_DO, code) ? 'clinicSharingHubNotResumed' : 'clinicSharingHubNotResumedOther';
        Alert.alert(I18n.t('clinicSharing'), I18n.t(key, {reason: clinicSharingErrorText(I18n, error)}));
    }
}

// Android can stop the hotspot while Avni is behind another app, so coming back to Avni restarts the hub as opening it does.
export function resumeClinicCampWhenOpened(hubService, I18n) {
    resumeClinicCamp(hubService, I18n);
    const subscription = AppState.addEventListener('change', (state) => {
        if (state === 'active') resumeClinicCamp(hubService, I18n);
    });
    return () => subscription.remove();
}
