class StaticFormElementGroup {
    constructor(form) {
        this.form = form;
    }

    next() {
        return this.form.formElementGroups[0];
    }

    previous() {
        return null;
    }

    get isLast() {
        return false;
    }

    get isFirst() {
        return true;
    }

    validate() {
        return [];
    }

    get formElementIds() {
        return [];
    }
}

export default StaticFormElementGroup;