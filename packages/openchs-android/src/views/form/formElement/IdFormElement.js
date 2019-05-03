import React from "react";
import _ from "lodash";
import AbstractFormElement from "./AbstractFormElement";
import TextFormElement from "./TextFormElement";

class IdFormElement extends AbstractFormElement {
    static propTypes = {
        element: React.PropTypes.object.isRequired,
        actionName: React.PropTypes.string.isRequired,
        value: React.PropTypes.object,
        validationResult: React.PropTypes.object,
        multiline: React.PropTypes.bool.isRequired,
        extraStyle: React.PropTypes.object
    };
    static defaultProps = {
        style: {}
    };

    constructor(props, context) {
        super(props, context);
    }

    render() {
        return <TextFormElement {...this.props} element={_.merge({}, this.props.element, {editable: false})} multiline={false}/>
    }
}

export default IdFormElement;