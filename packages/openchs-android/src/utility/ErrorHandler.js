import Config from '../framework/Config';
import General from "./General";
import ErrorUtil from "../framework/errorHandling/ErrorUtil";
import _ from 'lodash';
import AvniError from "../framework/errorHandling/AvniError";
import {setJSExceptionHandler} from 'react-native-exception-handler';

export default class ErrorHandler {
    static set(errorCallback) {
        console.log('ErrorHandler', `Setting global error handler ${Config.ENV}`);
        setJSExceptionHandler((error, isFatal) => {
            if (isFatal)
                ErrorHandler.postError(error, errorCallback);
            else
                General.logDebug('ErrorHandler', error);
        }, true);
    }

    static postScheduledJobError(error) {
        ErrorHandler.postError(error, _.noop);
    }

    static postError(error, errorCallback) {
        General.logDebug('ErrorHandler', error.message);

        ErrorUtil.notifyBugsnag(error, "ErrorHandler")
            .then((error) => {
                const stackTraceString = ErrorUtil.getNavigableStackTraceSync(error);
                const avniError = AvniError.createFromUserMessageAndStackTrace(error.message, stackTraceString);
                General.logDebug('ErrorHandler', avniError.reportingText);
                errorCallback(avniError);
            });
    }
}
