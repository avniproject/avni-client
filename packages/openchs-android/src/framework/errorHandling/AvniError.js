import _ from 'lodash';

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
        return _.truncate(this.userMessage, {length: 80});
    }
}

export default AvniError;
