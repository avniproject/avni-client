import StackTrace from 'stacktrace-js';
import bugsnag from './bugsnag';

export default class ErrorHandler {
    static set(errorCallback) {
        if (!__DEV__) {
            ErrorUtils.setGlobalHandler((error, isFatal) => {
                ErrorHandler.postError(error, isFatal, errorCallback);
            });
        }
    }

    static postError(error, isFatal, errorCallback) {
        console.log(`[ErrorHandler] IsFatal=${isFatal} ${error}`);
        console.log(JSON.stringify(error));
        error.message = `${isFatal ? 'Fatal' : 'Non-fatal'} error: ${error.message}`;
        console.log(`[ErrorHandler] Notifying Bugsnag ${error}`);
        bugsnag.notify(error);
        if (isFatal) {
            StackTrace.fromError(error, {offline: true})
                .then((x) => {
                    console.log(`[ErrorHandler] Creating frame array`);
                    const frameArray = x.map((row) => Object.defineProperty(row, 'fileName', {
                        value: `${row.fileName}:${row.lineNumber || 0}:${row.columnNumber || 0}`
                    }));
                    console.log(`[ErrorHandler] Frame array created. Logging Frame array.`);
                    console.log(JSON.stringify(frameArray));
                    console.log(`[ErrorHandler] Restarting app.`);
                    errorCallback(error, JSON.stringify(frameArray));
                });
        }
    }
}