import AbstractComponent from "../../framework/view/AbstractComponent";

class AbstractFormElement extends AbstractComponent {
    constructor(props, context) {
        super(props, context);
    }

    get label() {
        const mandatoryText = this.props.element.mandatory ? `  -  [${this.I18n.t("mandatory")}]` : '';
        return `${this.I18n.t(this.props.element.name)}${mandatoryText}`;
    }
}

export default AbstractFormElement;