import {Crashlytics} from 'react-native-fabric';
import StackTrace from 'stacktrace-js';

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
        if (isFatal) {
            StackTrace.fromError(error, {offline: true})
                .then((x) => {
                    console.log(`[ErrorHandler] Creating frame array`);
                    const frameArray = x.map((row) => Object.defineProperty(row, 'fileName', {
                        value: `${row.fileName}:${row.lineNumber || 0}:${row.columnNumber || 0}`
                    }));
                    console.log(`[ErrorHandler] Frame array created. Notifying Crashlytics. Logging Frame array.`);
                    console.log(JSON.stringify(frameArray));
                    Crashlytics.recordCustomExceptionName(x.message, x.message, frameArray);
                    console.log(`[ErrorHandler] Notified Crashlytics. Restarting app.`);
                    errorCallback(error, JSON.stringify(frameArray));
                });
        } else {
            console.log(`[ErrorHandler] Logging exception to Crashlytics`);
            Crashlytics.logException(error.message);
            console.log(`[ErrorHandler] Logged exception to Crashlytics`);
        }
    }
}