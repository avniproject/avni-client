import React from "react";
import PropTypes from 'prop-types';
import _ from "lodash";
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
        return <TextFormElement {...this.props} element={_.merge({}, this.props.element, {editable: false})} multiline={false}/>
    }
}

export default IdFormElement;