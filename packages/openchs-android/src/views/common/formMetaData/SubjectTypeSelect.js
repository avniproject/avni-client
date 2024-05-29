import AbstractComponent from "../../../framework/view/AbstractComponent";
import SubjectTypeService from "../../../service/SubjectTypeService";
import SelectableItemGroup from "../../primitives/SelectableItemGroup";
import React from "react";
import NamedSelectableEntities from "../../../model/NamedSelectableEntities";
import PropTypes from "prop-types";
import UserInfoService from "../../../service/UserInfoService";

class SubjectTypeSelect extends AbstractComponent {
    constructor(props, context) {
        super(props, context);
        this.state = {
            subjectTypes: []
        };
    }

    static propTypes = {
        selectedSubjectTypes: PropTypes.array.isRequired,
        onChange: PropTypes.func.isRequired,
        isMulti: PropTypes.bool.isRequired
    }

    render() {
        const {selectedSubjectTypes, isMulti, onChange} = this.props;
        const subjectTypeService = this.getService(SubjectTypeService);
        const subjectTypes = NamedSelectableEntities.create(subjectTypeService.getAllowedSubjectTypes(), []);
        const currentLocale = this.getService(UserInfoService).getUserSettings().locale;

        return <SelectableItemGroup labelKey={"subjectTypes"}
                                    I18n={this.I18n}
                                    labelValuePairs={subjectTypes.getOptions()}
                                    multiSelect={isMulti}
                                    onPress={(value) => onChange(subjectTypes.toggle(value))}
                                    selectionFn={(selectedVal) => selectedSubjectTypes.includes(selectedVal)}
                                    mandatory={false}
                                    inPairs={true}
                                    locale={currentLocale}/>
    }
}

export default SubjectTypeSelect;
