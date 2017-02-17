class ValidationResult {
    constructor(success, formElementUUID, messageKey) {
        this.success = success;
        this.formElementUUID = formElementUUID;
        this.messageKey = messageKey;
    }

    clone() {
        return new ValidationResult(this.success, this.formElementUUID, this.messageKey);
    }
}

export default ValidationResult;