import {Alert} from "react-native";
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

// A hub phone that restarted carries on its camp as soon as the app opens; when it cannot, Home says why.
export async function resumeClinicCamp(hubService, I18n) {
    try {
        await hubService.resumeCamp(hubLog);
    } catch (error) {
        General.logError('ClinicSharing', error);
        Alert.alert(I18n.t('clinicSharing'), I18n.t('clinicSharingHubNotResumed', {reason: clinicSharingErrorText(I18n, error)}));
    }
}
