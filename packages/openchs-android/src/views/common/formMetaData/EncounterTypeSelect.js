import AbstractComponent from "../../../framework/view/AbstractComponent";
import SelectableItemGroup from "../../primitives/SelectableItemGroup";
import React from "react";
import NamedSelectableEntities from "../../../model/NamedSelectableEntities";
import PropTypes from "prop-types";
import UserInfoService from "../../../service/UserInfoService";
import EncounterTypeService from "../../../service/EncounterTypeService";

class EncounterTypeSelect extends AbstractComponent {
    constructor(props, context) {
        super(props, context);
        this.state = {
            encounterTypes: []
        };
    }

    static propTypes = {
        subjectTypes: PropTypes.array.isRequired,
        programs: PropTypes.array.isRequired,
        selectedEncounterTypes: PropTypes.array.isRequired,
        onChange: PropTypes.func.isRequired,
        isMulti: PropTypes.bool.isRequired
    }

    render() {
        const {selectedEncounterTypes, subjectTypes, programs, isMulti, onChange} = this.props;
        const encounterTypeService = this.getService(EncounterTypeService);
        const encounterTypes = NamedSelectableEntities.create(encounterTypeService.getAllowedViewEncounterTypes(subjectTypes, programs));
        const currentLocale = this.getService(UserInfoService).getUserSettings().locale;
        const options = encounterTypes.getOptions();

        if (options.length === 0) {
            return null;
        }

        return <SelectableItemGroup labelKey={"chooseVisitType"}
                                    I18n={this.I18n}
                                    labelValuePairs={options}
                                    multiSelect={isMulti}
                                    onPress={(value) => onChange(encounterTypes.toggle(selectedEncounterTypes, value, isMulti))}
                                    selectionFn={(selectedVal) => _.some(selectedEncounterTypes, (x) => x.uuid === selectedVal)}
                                    mandatory={false}
                                    inPairs={true}
                                    locale={currentLocale}/>
    }
}

export default EncounterTypeSelect;
