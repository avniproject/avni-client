import ErrorUtil from "../framework/errorHandling/ErrorUtil";
import AvniError from "../framework/errorHandling/AvniError";

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
        case 503:
        case 504:
            return "serverUnavailable";
        default:
            return "unknownServerErrorReason";
    }
}

export function getAvniError(serverError, i18n) {
    const statusCode = getStatusCode(serverError);
    const errorCode = _.isNil(statusCode) ? "" : `Http ${statusCode}`;
    const avniError = new AvniError();
    const serverErrorPromise = serverError.response.text() || Promise.resolve(i18n.t("unknownServerErrorReason"));
    return serverErrorPromise.then((errorMessage) => {
        avniError.userMessage = `${i18n.t(getServerStatusMessageKey(serverError))}. ${errorCode}. ${errorMessage}`;
        return ErrorUtil.getNavigableStackTraceSync(serverError);
    }).then((stackTraceString) => {
        avniError.reportingText = `${avniError.userMessage}\n${stackTraceString}`;
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
