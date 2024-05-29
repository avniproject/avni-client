import AbstractComponent from "../../../framework/view/AbstractComponent";
import SubjectTypeSelect from "./SubjectTypeSelect";
import PropTypes from "prop-types";
import React from "react";

class FormMetaDataSelect extends AbstractComponent {
    constructor(props, context) {
        super(props, context);
    }

    static propTypes = {
        selectedSubjectTypes: PropTypes.array.isRequired,
        onChange: PropTypes.func.isRequired,
        isMulti: PropTypes.bool.isRequired
    }

    render() {
        return <SubjectTypeSelect selectedSubjectTypes={[]} onChange={() => {}} isMulti={true}/>;
    }
}

export default FormMetaDataSelect;
