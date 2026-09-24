import _ from "lodash";
import AuthenticationError, {NETWORK_ERROR} from "../../service/AuthenticationError";
import {SYNC_TIMEOUT_ERROR} from "../http/requests";

// React Native's fetch rejects with exactly this when the request never reaches the network.
// There is no code to match on, so the message is the only signal available.
export const RN_FETCH_FAILURE_MESSAGE = 'Network request failed';

// A DNS failure names the host it could not resolve, so only the prefix is fixed.
export const DNS_FAILURE_PREFIX = 'Unable to resolve host';

// These are what a field connection does, not what a defect looks like. They are recorded either
// way — SyncTelemetry rows and the Firebase sync_failed event both carry the failure and its
// reason — but they are numerous enough to exhaust Bugsnag's rate limit, which discards the real
// defects arriving alongside them. Matched on message text because none of them carry a code;
// the tests pin each signature so a rename fails loudly rather than quietly restoring the noise.
export function isExpectedTransientNetworkError(error) {
    if (_.isNil(error)) return false;
    if (error instanceof AuthenticationError) return error.authErrCode === NETWORK_ERROR;

    const message = _.get(error, 'message');
    if (!_.isString(message)) return false;
    return message === SYNC_TIMEOUT_ERROR
        || message === RN_FETCH_FAILURE_MESSAGE
        || _.startsWith(message, DNS_FAILURE_PREFIX);
}
