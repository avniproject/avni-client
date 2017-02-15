import _ from "lodash";

class ValidationResult {
    constructor(uuid, message) {
        this.formElementUUID = uuid;
        this.message = message;
    }

    clone() {
        return new ValidationResult(this.formElementUUID, this.message);
    }
}

export default ValidationResult;