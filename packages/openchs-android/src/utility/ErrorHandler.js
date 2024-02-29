import bugsnag from './bugsnag';
import Config from '../framework/Config';
import General from "./General";
import EnvironmentConfig from "../framework/EnvironmentConfig";
import ErrorUtil from "../framework/errorHandling/ErrorUtil";
import _ from 'lodash';
import AvniError from "../framework/errorHandling/AvniError";
import {setJSExceptionHandler} from 'react-native-exception-handler';

export default class ErrorHandler {
    static set(errorCallback) {
        console.log('ErrorHandler', `Setting global error handler ${Config.ENV}`);
        setJSExceptionHandler((error, isFatal) => {
            if (isFatal)
                ErrorHandler.postError(error, isFatal, errorCallback);
            else
                General.logDebug('ErrorHandler', error);
        }, true);
    }

    static setUser(username) {
        bugsnag.setUser(username, username, username);
    }

    static postScheduledJobError(error) {
        this.postError(error, true, _.noop);
    }

    static postError(error, isFatal, errorCallback) {
        General.logDebug('ErrorHandler', error.message);

        ErrorUtil.createBugsnagStackFrames(error).then((frameArray) => {
            General.logDebug('ErrorHandler', `Notifying Bugsnag (if release stage) ${error}`);
            if (EnvironmentConfig.inNonDevMode()) {
                error.message = `${isFatal ? 'Fatal' : 'Non-fatal'} error: ${error.message}`;
                bugsnag.notify(error, (report) => report.metadata.frameArray = frameArray);
            }
            return ErrorUtil.getNavigableStackTraceSync(error);
        }).then((stackTraceString) => {
            const avniError = AvniError.createFromUserMessageAndStackTrace(error.message, stackTraceString);
            General.logDebug('ErrorHandler', avniError.reportingText);
            errorCallback(avniError);
        });
    }
}
