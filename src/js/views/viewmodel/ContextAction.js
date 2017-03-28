import _ from "lodash";

class ContextAction {
    constructor(labelKey, onPressFunc) {
        this.labelKey = labelKey;
        this.onPressFunc = onPressFunc;
    }
}

export default ContextAction;