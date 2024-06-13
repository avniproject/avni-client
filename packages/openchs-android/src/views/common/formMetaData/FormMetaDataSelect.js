import AbstractComponent from "../../../framework/view/AbstractComponent";
import SubjectTypeSelect from "./SubjectTypeSelect";
import PropTypes from "prop-types";
import React from "react";
import ProgramSelect from "./ProgramSelect";
import EncounterTypeSelect from "./EncounterTypeSelect";
import ProgramService from "../../../service/program/ProgramService";
import EncounterTypeService from "../../../service/EncounterTypeService";

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
        const programService = this.getService(ProgramService);
        const encounterTypeService = this.getService(EncounterTypeService);
        const {formMetaDataSelections, onChange} = this.props;
        return <>
            <SubjectTypeSelect
                selectedSubjectTypes={formMetaDataSelections.subjectTypes}
                onChange={(selectedSubjectTypes) => {
                    const programs = programService.getAllowedViewPrograms(selectedSubjectTypes);
                    const encounterTypes = encounterTypeService.getAllowedViewEncounterTypes(selectedSubjectTypes, programs)
                    formMetaDataSelections.updateSubjectTypes(selectedSubjectTypes, programs, encounterTypes);
                    onChange(formMetaDataSelections);
                }}
                isMulti={true}/>
            {formMetaDataSelections.subjectTypes.length > 0 &&
                <ProgramSelect
                    subjectTypes={formMetaDataSelections.subjectTypes}
                    selectedPrograms={formMetaDataSelections.programs}
                    onChange={(selectedPrograms) => {
                        const encounterTypes = encounterTypeService.getAllowedViewEncounterTypes(formMetaDataSelections.subjectTypes, selectedPrograms);
                        formMetaDataSelections.updatePrograms(selectedPrograms, encounterTypes);
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
