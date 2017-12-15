import RuleCondition from "./RuleCondition";
import {FormElementStatus} from "openchs-models";
export default class FormElementStatusBuilder {

    constructor(context) {
        this.context = context;
        this.visibilityRule = new RuleCondition(context);
        this.valueRule = new RuleCondition(context);
    }

    show() {
        return this.visibilityRule;
    }

    value(value) {
        this.value = value;
        return this.valueRule;
    }

    build() {
        return new FormElementStatus(this.context.formElement.uuid, this.visibilityRule.matches(), this.valueRule.matches()? this.value: null);
    }
}