import _ from "lodash";
import AuthenticationError, {NETWORK_ERROR, requiresReLogin} from "../../service/AuthenticationError";
import MediaUploadError from "./MediaUploadError";

// Defined here rather than in requests.js, which raises it, so ErrorUtil can use it without an import cycle through ServerError.
export const SYNC_TIMEOUT_ERROR = "syncTimeoutError";

// React Native's fetch rejects with exactly this, whatever the cause below the HTTP layer.
export const RN_FETCH_FAILURE_MESSAGE = 'Network request failed';

// A DNS failure names the host it could not resolve, so only the prefix is fixed.
export const DNS_FAILURE_PREFIX = 'Unable to resolve host';

// Raised when the app cancels an upload that made no progress for a minute. A fixed string: it is also a Firebase sync failure reason.
export const UPLOAD_STALLED_MESSAGE = 'Upload stalled - no progress for 60 seconds';

// Numerous enough to exhaust Bugsnag's rate limit; matched on message text because only the Cognito one carries a code.
export function isExpectedTransientNetworkError(error) {
    if (_.isNil(error)) return false;
    if (error instanceof AuthenticationError) return error.authErrCode === NETWORK_ERROR;

    const message = _.get(error, 'message');
    if (!_.isString(message)) return false;
    return message === SYNC_TIMEOUT_ERROR
        || message === RN_FETCH_FAILURE_MESSAGE
        || _.startsWith(message, DNS_FAILURE_PREFIX);
}

// A code that sends the user to log in again; the forced-login-prompt event in Firebase records it instead. A codeless failure may be a defect, so it still reports.
function isSessionEnded(error) {
    return error instanceof AuthenticationError && !_.isNil(error.authErrCode) && requiresReLogin(error);
}

// Only our own stall cancel; a bare "canceled" from the upload library is not matched.
function isUploadStall(error) {
    if (error instanceof MediaUploadError) return isUploadStall(error.originalError);
    return _.get(error, 'message') === UPLOAD_STALLED_MESSAGE;
}

// Expected failures already recorded elsewhere, kept out of Bugsnag. #2142 #2159
export function isExpectedNonDefect(error) {
    return isExpectedTransientNetworkError(error) || isSessionEnded(error) || isUploadStall(error);
}
