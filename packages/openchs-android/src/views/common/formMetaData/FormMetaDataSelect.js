import AbstractComponent from "../../../framework/view/AbstractComponent";
import SubjectTypeSelect from "./SubjectTypeSelect";
import PropTypes from "prop-types";
import React from "react";
import ProgramSelect from "./ProgramSelect";
import EncounterTypeSelect from "./EncounterTypeSelect";

class FormMetaDataSelect extends AbstractComponent {
    constructor(props, context) {
        super(props, context);
    }

    static propTypes = {
        formMetaDataSelections: PropTypes.object.isRequired,
        onChange: PropTypes.func.isRequired,
        isMulti: PropTypes.bool.isRequired
    }

    render() {
        const {formMetaDataSelections, onChange} = this.props;
        return <>
            <SubjectTypeSelect
                selectedSubjectTypes={formMetaDataSelections.subjectTypes}
                onChange={(x) => {
                    formMetaDataSelections.subjectTypes = x;
                    onChange(formMetaDataSelections);
                }}
                isMulti={true}/>
            {formMetaDataSelections.subjectTypes.length > 0 &&
                <ProgramSelect
                    subjectTypes={formMetaDataSelections.subjectTypes}
                    selectedPrograms={formMetaDataSelections.programs}
                    onChange={(x) => {
                        formMetaDataSelections.programs = x;
                        onChange(formMetaDataSelections);
                    }}
                    isMulti={true}
                />
            }
            {formMetaDataSelections.subjectTypes.length > 0 && <EncounterTypeSelect
                subjectTypes={formMetaDataSelections.subjectTypes}
                programs={formMetaDataSelections.programs}
                selectedEncounterTypes={formMetaDataSelections.encounterTypes}
                onChange={(x) => {
                    formMetaDataSelections.encounterTypes = x;
                    onChange(formMetaDataSelections);
                }}
                isMulti={true}/>}
        </>;
    }
}

export default FormMetaDataSelect;
