import _ from "lodash";
import {SyncError} from "avni-models";
import AuthenticationError from "../../service/AuthenticationError";
import ServerError from "../../service/ServerError";
import MediaUploadError from "./MediaUploadError";
import AvniError from "./AvniError";
import {DNS_FAILURE_PREFIX, RN_FETCH_FAILURE_MESSAGE, SYNC_TIMEOUT_ERROR} from "./ExpectedTransientNetworkError";

// Firebase rejects event parameter values longer than this.
const FIREBASE_PARAM_VALUE_LIMIT = 100;

// Messages are only used when they are one of our fixed signatures; free text can carry server bodies or user data.
const KNOWN_MESSAGES = [SYNC_TIMEOUT_ERROR, RN_FETCH_FAILURE_MESSAGE, 'internetConnectionError'];

function reasonOf(error) {
    if (_.isNil(error)) return 'unknown';
    if (error instanceof AuthenticationError) return _.isNil(error.authErrCode) ? 'AuthenticationError' : String(error.authErrCode);
    if (error instanceof ServerError) {
        const status = _.get(error, 'response.status');
        return _.isNil(status) ? 'ServerError' : `Http ${status}`;
    }
    if (error instanceof MediaUploadError) return `MediaUploadError: ${reasonOf(error.originalError)}`;
    if (error instanceof SyncError) return `SyncError: ${error.errorCode}`;
    if (error instanceof AvniError) return 'AvniError';

    const message = _.get(error, 'message');
    if (_.includes(KNOWN_MESSAGES, message)) return message;
    if (_.startsWith(message, DNS_FAILURE_PREFIX)) return DNS_FAILURE_PREFIX;
    return _.get(error, 'name') || 'unknown';
}

export function syncFailureReason(error) {
    return reasonOf(error).substring(0, FIREBASE_PARAM_VALUE_LIMIT);
}
