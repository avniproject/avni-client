import _ from 'lodash';
import EnvironmentConfig from "../EnvironmentConfig";

class AvniError {
    userMessage;
    reportingText;
    showOnlyUserMessage;

    static create(userMessage, reportingText, showOnlyUserMessage = false) {
        const avniError = new AvniError();
        avniError.userMessage = userMessage;
        avniError.reportingText = reportingText;
        avniError.showOnlyUserMessage = showOnlyUserMessage;
        return avniError;
    }

    static createFromUserMessageAndStackTrace(userMessage, stackTraceString) {
        return AvniError.create(userMessage, `${userMessage}\n${stackTraceString}`);
    }

    getDisplayMessage() {
        if (EnvironmentConfig.isHighSecurity() || this.showOnlyUserMessage)
            return _.truncate(this.userMessage, {length: 80});

        return _.truncate(this.reportingText, {length: 600});
    }
}

export default AvniError;
