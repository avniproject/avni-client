import StackTrace from "stacktrace-js";
import AvniError from "./AvniError";
import ErrorStackParser from "error-stack-parser";

function createNavigableStackTrace(stackFrames) {
    return stackFrames.map((sf) => {
        return `at ${sf.toString()}`;
    }).join('\n');
}

class ErrorUtil {
    //Errors can potentially un-streamed
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
}

export default ErrorUtil;
