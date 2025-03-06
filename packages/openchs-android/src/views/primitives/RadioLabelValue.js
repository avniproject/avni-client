class RadioLabelValue {
    constructor(label, value, abnormal = false, subject = null) {
        this.label = label;
        this.value = value;
        this.abnormal = abnormal;
        this.subject = subject;
    }
}

export default RadioLabelValue;
