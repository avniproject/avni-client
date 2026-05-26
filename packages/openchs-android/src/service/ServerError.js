import ErrorUtil from "../framework/errorHandling/ErrorUtil";
import AvniError from "../framework/errorHandling/AvniError";
import _ from "lodash";
import {ErrorCodes} from "openchs-models";

function ServerError(response) {
    const instance = new Error(response);
    instance.response = response;

    if (Object.setPrototypeOf) {
        Object.setPrototypeOf(instance, Object.getPrototypeOf(this));
    } else {
        instance.__proto__ = Object.getPrototypeOf(this);
    }
    return instance;
}

function getStatusCode(serverError) {
    return _.get(serverError, "response.status");
}

function getServerStatusMessageKey(serverError) {
    const statusCode = getStatusCode(serverError);
    if (_.isNil(statusCode))
        return "noStatusMessage";

    switch (statusCode) {
        case 408:
            return "poorConnection";
        case 429:
        case 502:
        case 503:
        case 504:
            return "serverUnavailableTryLater";
        default:
            return "unknownServerErrorReason";
    }
}

const knownServerStatusMessages = ['serverUnavailableTryLater'];
const knownServerExceptionMessages = ['NoCatchmentFound', 'CatchmentTooLarge', 'FutureScheduledDateNotAllowed'];

// Server-typed errors return a JSON body like {"error": "FutureScheduledDateNotAllowed", ...};
// older paths return the error name as plain text. Prefer the JSON shape and fall back to the raw
// text on parse failure so we stay backwards-compatible.
function extractErrorKey(responseBody) {
    if (!_.isString(responseBody)) return responseBody;
    try {
        const parsed = JSON.parse(responseBody);
        if (parsed && _.isString(parsed.error)) return parsed.error;
    } catch (e) { /* not JSON; fall through */ }
    return responseBody;
}

export function getAvniError(serverError, i18n) {
    const statusCode = getStatusCode(serverError);
    const errorCode = _.isNil(statusCode) ? "" : `Http ${statusCode}`;
    const avniError = new AvniError();
    const serverErrorPromise = serverError.response.text() || Promise.resolve(i18n.t("unknownServerErrorReason"));
    return serverErrorPromise.then((errorMessage) => {
        const errorMessageKey = extractErrorKey(errorMessage);
        const statusMessageKey = getServerStatusMessageKey(serverError);
        if (_.includes(knownServerStatusMessages, statusMessageKey)) {
            avniError.userMessage = `${i18n.t(statusMessageKey)}`;
            avniError.showOnlyUserMessage = true;
        } else if (_.includes(knownServerExceptionMessages, errorMessageKey)) {
            avniError.userMessage = `${i18n.t(ErrorCodes[errorMessageKey] || errorMessageKey)}`;
            avniError.showOnlyUserMessage = true;
        } else {
            avniError.userMessage = `${i18n.t(statusMessageKey)}. ${errorCode}. ${errorMessage}`;
        }
        return ErrorUtil.getNavigableStackTraceSync(serverError);
    }).then((stackTraceString) => {
        avniError.reportingText = `${avniError.userMessage}\n\n${stackTraceString}`;
        return avniError;
    });
}

ServerError.prototype = Object.create(Error.prototype, {
    constructor: {
        value: Error,
        enumerable: false,
        writable: true,
        configurable: true
    }
});

if (Object.setPrototypeOf){
    Object.setPrototypeOf(ServerError, Error);
} else {
    ServerError.__proto__ = Error;
}

export default ServerError;
