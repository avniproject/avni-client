import {Crashlytics} from 'react-native-fabric';
import {NativeModules} from 'react-native';
import StackTrace from 'stacktrace-js';

const {Restart} = NativeModules;

export default class ErrorHandler {
    static set() {
        if (!__DEV__) {
            ErrorUtils.setGlobalHandler((error, isFatal) => {
                error.message = `ErrorUtils: handled ${isFatal ? 'fatal' : 'non-fatal'} error: ${error.message}`;
                if (isFatal) {
                    StackTrace.fromError(error, {offline: true})
                        .then((x) => {
                            const frameArray = x.map((row) => Object.assign({}, row, {
                                fileName: `${row.fileName}:${row.lineNumber || 0}:${row.columnNumber || 0}`
                            }));
                            console.log(error.message);
                            console.log(JSON.stringify(error));
                            console.log(JSON.stringify(frameArray));
                            Crashlytics.recordCustomExceptionName(x.message, x.message, frameArray);
                            Restart.restart();
                        });
                } else {
                    Crashlytics.logException(error.message);
                }
            });
        }
    }

}