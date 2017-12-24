class FormElementStatus {
    constructor(uuid, visibility, value, answersToSkip = []) {
        this.uuid = uuid;
        this.visibility = visibility;
        this.value = value;
        this.answersToSkip = answersToSkip;
    }

    _bool(formElementStatus, op) {
        const oredFormElementStatus = new FormElementStatus();
        oredFormElementStatus.uuid = this.uuid;
        oredFormElementStatus.visibility = op(this.visibility, formElementStatus.visibility);
        oredFormElementStatus.value = this.value;
        oredFormElementStatus.answersToSkip = this.answersToSkip;
        return oredFormElementStatus;
    }

    or(formElementStatus) {
        return this._bool(formElementStatus, (a, b) => a || b);
    }

    and(formElementStatus) {
        return this._bool(formElementStatus, (a, b) => a && b);
    }
}

export default FormElementStatus;