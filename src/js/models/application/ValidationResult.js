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

    static failure(formIdentifier, messageKey) {
        return new ValidationResult(false, formIdentifier, messageKey);
    }

    clone() {
        return new ValidationResult(this.success, this.formIdentifier, this.messageKey);
    }
}

export default ValidationResult;