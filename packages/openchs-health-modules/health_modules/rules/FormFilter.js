import _ from 'lodash';
import RuleCondition from "./RuleCondition";
export default class FormFilter {

    constructor(context) {
        this.context = context;
        this.formRuleConditions = [];
    }

    hide(formElementName) {
        let formElement = this.context.form.findFormElement(formElementName);
        const formRuleCondition = new RuleCondition(_.merge(this.context, {conceptName: formElement.concept.name}));
        this.formRuleConditions.push({formElementName: formElementName, condition: formRuleCondition});
        return formRuleCondition;
    }

    filteredForm() {
        var form = this.context.form;
        _.forEach(this.formRuleConditions, (conditionObj) => {
            if (conditionObj.condition.matches()) {
                form = form.removeFormElement(conditionObj.formElementName);
            }
        });
        return form;
    }
}