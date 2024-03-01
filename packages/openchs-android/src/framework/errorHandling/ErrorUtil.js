import StackTrace from "stacktrace-js";
import AvniError from "./AvniError";
import ErrorStackParser from "error-stack-parser";
import EnvironmentConfig from "../EnvironmentConfig";
import General from "../../utility/General";
import bugsnag from "../../utility/bugsnag";

function createNavigableStackTrace(stackFrames) {
    return stackFrames.map((sf) => {
        return `at ${sf.toString()}`;
    }).join('\n');
}

class ErrorUtil {
    static createBugsnagStackFrames(error) {
        return StackTrace.fromError(error, {offline: true})
            .then((x) => {
                return x.map((row) => Object.defineProperty(row, 'fileName', {
                    value: `${row.fileName}:${row.lineNumber || 0}:${row.columnNumber || 0}`
                }));
            });
    }

    static getAvniErrorSync(error) {
        return AvniError.createFromUserMessageAndStackTrace(error.message, createNavigableStackTrace(ErrorStackParser.parse(error)));
    }

    static getNavigableStackTraceSync(error) {
        return createNavigableStackTrace(ErrorStackParser.parse(error))
    }

    static notifyBugsnagWithComponentStack(error, errorInfo) {
        return ErrorUtil.createBugsnagStackFrames(error).then((frameArray) => {
            if (EnvironmentConfig.inNonDevMode()) {
                General.logDebug('ErrorHandler', `Notifying Bugsnag with component stack`);
                error.message = error.message + "\n" + errorInfo.componentStack;
                bugsnag.notify(error, (report) => report.metadata.frameArray = frameArray);
            }
            return error;
        });
    }

    static notifyBugsnag(error, source) {
        return ErrorUtil.createBugsnagStackFrames(error).then((frameArray) => {
            if (EnvironmentConfig.inNonDevMode()) {
                General.logDebug('ErrorHandler', `Notifying Bugsnag: ${source}`);
                bugsnag.notify(error, (report) => report.metadata.frameArray = frameArray);
            }
            return error;
        });
    }
}

export default ErrorUtil;
