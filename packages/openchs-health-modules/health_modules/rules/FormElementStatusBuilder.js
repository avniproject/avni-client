import RuleCondition from "./RuleCondition";
import {FormElementStatus} from "openchs-models";
export default class FormElementStatusBuilder {

    constructor(context) {
        this.context = context;
        this.visibilityRule = new RuleCondition();
        this.valueRule = new RuleCondition();
    }

    show() {
        this.visibilityRule = new RuleCondition(this.context);
        return this.visibilityRule;
    }

    value(value) {
        this.value = value;
        this.valueRule = new RuleCondition(this.context);
        return this.valueRule;
    }

    build() {
        return new FormElementStatus(this.context.formElement.uuid, this.visibilityRule.matches(), this.valueRule.matches()? this.value: null);
    }
}