import StackTrace from 'stacktrace-js';
import bugsnag from './bugsnag';
import Config from '../framework/Config';
import General from "./General";
import AppConfig from "../framework/AppConfig";

export default class ErrorHandler {
    static set(errorCallback) {
        console.log('ErrorHandler', "Setting global error handler", Config.ENV);
        ErrorUtils.setGlobalHandler((error, isFatal) => {
            ErrorHandler.postError(error, isFatal, errorCallback);
        });
    }

    static setUser(username) {
        bugsnag.setUser(username, username, username);
    }

    static postScheduledJobError(error) {
        this.postError(error, true, () => {
        });
    }

    static postError(error, isFatal, errorCallback) {
        General.logDebug('ErrorHandler', `IsFatal=${isFatal} ${error}`);
        General.logDebug('ErrorHandler', error);
        error.message = `${isFatal ? 'Fatal' : 'Non-fatal'} error: ${error.message}`;

        StackTrace.fromError(error, {offline: true})
            .then((x) => {
                General.logDebug('ErrorHandler', `Creating frame array`);
                const frameArray = x.map((row) => Object.defineProperty(row, 'fileName', {
                    value: `${row.fileName}:${row.lineNumber || 0}:${row.columnNumber || 0}`
                }));
                General.logDebug('ErrorHandler', `Notifying Bugsnag ${error}`);
                bugsnag.notify(error, (report) => report.metadata.frameArray = frameArray);
                errorCallback(error, JSON.stringify(frameArray));
            });

        if (AppConfig.inNonDevMode()) {
            bugsnag.notify(error);
        }
    }
}
