import _ from "lodash";
import AuthenticationError, {NETWORK_ERROR} from "../../service/AuthenticationError";

// Defined here rather than in requests.js, which raises it, so ErrorUtil can use it without an import cycle through ServerError.
export const SYNC_TIMEOUT_ERROR = "syncTimeoutError";

// React Native's fetch rejects with exactly this, whatever the cause below the HTTP layer.
export const RN_FETCH_FAILURE_MESSAGE = 'Network request failed';

// A DNS failure names the host it could not resolve, so only the prefix is fixed.
export const DNS_FAILURE_PREFIX = 'Unable to resolve host';

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
