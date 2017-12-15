class FormElementStatus {
    constructor(uuid, visibility, value, answersToSkip = []) {
        this.uuid = uuid;
        this.visibility = visibility;
        this.value = value;
        this.answersToSkip = answersToSkip;
    }
}

export default FormElementStatus;