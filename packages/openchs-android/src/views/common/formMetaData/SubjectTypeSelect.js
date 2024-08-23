import AbstractComponent from "../../../framework/view/AbstractComponent";
import SubjectTypeService from "../../../service/SubjectTypeService";
import SelectableItemGroup from "../../primitives/SelectableItemGroup";
import {Text} from "react-native";
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
        const subjectTypes = NamedSelectableEntities.create(subjectTypeService.getAllowedSubjectTypes());
        const currentLocale = this.getService(UserInfoService).getUserSettings().locale;
        const options = subjectTypes.getOptions();

        if (options.length === 0) {
            return <Text>No subject types found</Text>;
        }

        return <SelectableItemGroup labelKey={"subjectTypes"}
                                    I18n={this.I18n}
                                    labelValuePairs={options}
                                    multiSelect={isMulti}
                                    onPress={(value) => onChange(subjectTypes.toggle(selectedSubjectTypes, value, isMulti))}
                                    selectionFn={(selectedVal) => _.some(selectedSubjectTypes, (x) => x.uuid === selectedVal)}
                                    mandatory={false}
                                    inPairs={true}
                                    locale={currentLocale}/>;
    }
}

export default SubjectTypeSelect;
