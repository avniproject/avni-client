import _ from 'lodash';
import EnvironmentConfig from "../EnvironmentConfig";

class AvniError {
    userMessage;
    reportingText;

    static create(userMessage, reportingText) {
        const avniError = new AvniError();
        avniError.userMessage = userMessage;
        avniError.reportingText = reportingText;
        return avniError;
    }

    static createFromUserMessageAndStackTrace(userMessage, stackTraceString) {
        return AvniError.create(userMessage, `${userMessage}\n${stackTraceString}`);
    }

    getDisplayMessage() {
        if (EnvironmentConfig.isHighSecurity())
            return _.truncate(this.userMessage, {length: 80});

        return _.truncate(this.reportingText, {length: 600});
    }
}

export default AvniError;
