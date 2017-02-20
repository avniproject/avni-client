class ValidationResult {
    constructor(success, formIdentifier, messageKey) {
        this.success = success;
        this.formIdentifier = formIdentifier;
        this.messageKey = messageKey;
    }

    static successful(formIdentifier) {
        return new ValidationResult(true, formIdentifier);
    }

    static failureForEmpty(formIdentifier) {
        return new ValidationResult(false, formIdentifier, 'emptyValidationMessage');
    }

    clone() {
        return new ValidationResult(this.success, this.formIdentifier, this.messageKey);
    }
}

export default ValidationResult;