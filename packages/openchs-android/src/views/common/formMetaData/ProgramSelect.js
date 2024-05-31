import AbstractComponent from "../../../framework/view/AbstractComponent";
import SelectableItemGroup from "../../primitives/SelectableItemGroup";
import React from "react";
import NamedSelectableEntities from "../../../model/NamedSelectableEntities";
import PropTypes from "prop-types";
import UserInfoService from "../../../service/UserInfoService";
import ProgramService from "../../../service/program/ProgramService";

class ProgramSelect extends AbstractComponent {
    constructor(props, context) {
        super(props, context);
        this.state = {
            programs: []
        };
    }

    static propTypes = {
        subjectTypes: PropTypes.array.isRequired,
        selectedPrograms: PropTypes.array.isRequired,
        onChange: PropTypes.func.isRequired,
        isMulti: PropTypes.bool.isRequired
    }

    render() {
        const {selectedPrograms, subjectTypes, isMulti, onChange} = this.props;
        const programService = this.getService(ProgramService);
        const programs = NamedSelectableEntities.create(programService.getAllowedViewPrograms(subjectTypes));
        const currentLocale = this.getService(UserInfoService).getUserSettings().locale;
        const options = programs.getOptions();

        if (options.length === 0) {
            return null;
        }

        return <SelectableItemGroup labelKey={"programs"}
                                    I18n={this.I18n}
                                    labelValuePairs={options}
                                    multiSelect={isMulti}
                                    onPress={(value) => onChange(programs.toggle(selectedPrograms, value, isMulti))}
                                    selectionFn={(selectedVal) => _.some(selectedPrograms, (x) => x.uuid === selectedVal)}
                                    mandatory={false}
                                    inPairs={true}
                                    locale={currentLocale}/>
    }
}

export default ProgramSelect;
