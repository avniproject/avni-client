import AbstractComponent from "../../framework/view/AbstractComponent";
import _ from 'lodash';
import Colors from '../primitives/Colors';

class AbstractFormElement extends AbstractComponent {
    constructor(props, context) {
        super(props, context);
    }

    get label() {
        const mandatoryText = this.props.element.mandatory ? `  -  [${this.I18n.t("mandatory")}]` : '';
        return `${this.I18n.t(this.props.element.name)}${mandatoryText}`;
    }

    get borderColor() {
        return _.isNil(this.props.validationResult) ? Colors.InputBorderNormal : Colors.ValidationError;
    }

    get textColor() {
        return _.isNil(this.props.validationResult) ? Colors.InputNormal : Colors.ValidationError;
    }
}

export default AbstractFormElement;