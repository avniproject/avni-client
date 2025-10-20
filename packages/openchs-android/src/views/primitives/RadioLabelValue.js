class RadioLabelValue {
    constructor(label, value, abnormal = false, subject = null, media = []) {
        this.label = label;
        this.value = value;
        this.abnormal = abnormal;
        this.subject = subject;
        this.media = media;
    }
}

export default RadioLabelValue;
