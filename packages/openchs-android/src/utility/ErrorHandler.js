import {Crashlytics} from 'react-native-fabric';
import {NativeModules} from 'react-native';
import StackTrace from 'stacktrace-js';

const {Restart} = NativeModules;

export default class ErrorHandler {
    static set() {
        if (!__DEV__) {
            ErrorUtils.setGlobalHandler((error, isFatal) => {
                ErrorHandler.postError(error, isFatal);
            });
        }
    }

    static postError(error, isFatal) {
        console.log(`[ErrorHandler] IsFatal=${isFatal}`);
        console.log(JSON.stringify(error));
        error.message = `ErrorUtils: handled ${isFatal ? 'fatal' : 'non-fatal'} error: ${error.message}`;
        if (isFatal) {
            StackTrace.fromError(error, {offline: true})
                .then((x) => {
                    console.log(`[ErrorHandler] Creating frame array`);
                    const frameArray = x.map((row) => Object.assign({}, row, {
                        fileName: `${row.fileName}:${row.lineNumber || 0}:${row.columnNumber || 0}`
                    }));
                    console.log(`[ErrorHandler] Frame array created. Notifying Crashlytics. Logging Frame array.`);
                    console.log(JSON.stringify(frameArray));
                    Crashlytics.recordCustomExceptionName(x.message, x.message, frameArray);
                    console.log(`[ErrorHandler] Notified Crashlytics. Restarting app.`);
                    Restart.restart();
                });
        } else {
            console.log(`[ErrorHandler] Logging exception to Crashlytics`);
            Crashlytics.logException(error.message);
            console.log(`[ErrorHandler] Logged exception to Crashlytics`);
        }
    }
}