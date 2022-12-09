import React from "react";
import PropTypes from 'prop-types';
import AbstractFormElement from "./AbstractFormElement";
import TextFormElement from "./TextFormElement";

class IdFormElement extends AbstractFormElement {
    static propTypes = {
        element: PropTypes.object.isRequired,
        actionName: PropTypes.string.isRequired,
        value: PropTypes.object,
        validationResult: PropTypes.object,
        multiline: PropTypes.bool.isRequired,
        extraStyle: PropTypes.object
    };
    static defaultProps = {
        style: {}
    };

    constructor(props, context) {
        super(props, context);
    }

    render() {
        let newFormElement = this.props.element.toJSON();
        newFormElement.editable = false
        return <TextFormElement {...this.props} element={newFormElement} multiline={false}/>
    }
}

export default IdFormElement;