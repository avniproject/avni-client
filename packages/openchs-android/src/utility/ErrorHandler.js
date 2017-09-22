import {Crashlytics} from 'react-native-fabric';
import {NativeModules} from 'react-native';
import StackTrace from 'stacktrace-js';

const {Restart} = NativeModules;

export default class ErrorHandler {
    static set() {
        if (!__DEV__) {
            ErrorUtils.setGlobalHandler((error, isFatal) => {
                error.message = `ErrorUtils: handled ${isFatal ? 'fatal' : 'non-fatal'} error: ${error.message}`;
                console.log(JSON.stringify(error.message));
                if (isFatal) {
                    StackTrace.fromError(error, {offline: true})
                        .then((x) => {
                            Crashlytics.recordCustomExceptionName(x.message, x.message, x);
                            Restart.restart();
                        });
                } else {
                    Crashlytics.logException(error.message);
                }
            });
        }
    }

}