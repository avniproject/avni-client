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
        avniError.showOnlyUserMessage = !reportingText || showOnlyUserMessage;
        return avniError;
    }

    static createFromUserMessageAndStackTrace(userMessage, stackTraceString) {
        const regexToUserMessageMap = [
            {
                regex: /.*(Provided schema version \d+ is less than last set)/i,
                userMessage: "Update the app to continue fast sync or click on 'perform slow sync'/तेज़ सिंक जारी रखने के लिए ऐप को अपडेट करें, या 'धीमा सिंक करें' पर क्लिक करें।"
            }
        ];

        for (const { regex, userMessage: replacementMessage } of regexToUserMessageMap) {
            if (regex.test(userMessage)) {
                userMessage = replacementMessage;
                return AvniError.create(userMessage, `${userMessage}\n${stackTraceString}`, true);
            }
        }

        return AvniError.create(userMessage, `${userMessage}\n${stackTraceString}`);
    }

    getDisplayMessage() {
        if (EnvironmentConfig.isHighSecurity() || this.showOnlyUserMessage)
            return _.truncate(this.userMessage, {length: 80});

        return _.truncate(this.reportingText, {length: 600});
    }
}

export default AvniError;
