class RadioLabelValue {
    constructor(label, value, abnormal = false, subject = null, mediaType = null, mediaUrl = null) {
        this.label = label;
        this.value = value;
        this.abnormal = abnormal;
        this.subject = subject;
        this.mediaType = mediaType;
        this.mediaUrl = mediaUrl;
    }
}

export default RadioLabelValue;
