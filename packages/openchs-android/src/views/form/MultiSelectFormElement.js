import React from "react";
import AbstractFormElement from "./AbstractFormElement";
import SelectFormElement from "./SelectFormElement";

class MultiSelectFormElement extends AbstractFormElement {
    render() {
        return (
            <SelectFormElement multiSelect={true}
                               isSelected={(answer) => this.props.multipleCodeValues.isAnswerAlreadyPresent(answer)}
                               {...this.props}/>);
    }

}

export default MultiSelectFormElement;