import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import RadioGroup, {RadioLabelValue} from "../primitives/RadioGroup";
import General from "../../utility/General";
import Styles from "../primitives/Styles";
import SelectableItemGroup from "../primitives/SelectableItemGroup";
import UserInfoService from "../../service/UserInfoService";

class AddressLevel extends AbstractComponent {
    static propTypes = {
        multiSelect: PropTypes.bool,
        levelType: PropTypes.string,
        validationError: PropTypes.object,
        mandatory: PropTypes.bool,
        onToggle: PropTypes.func
    };

    viewName() {
        return 'AddressLevel';
    }

    constructor(props, context) {
        super(props, context);
    }

    render() {
        General.logDebug(this.viewName(), 'render');
        const valueLabelPairs = this.props.levels.map(({uuid, name}) => new RadioLabelValue(this.I18n.t(name), uuid));
        const currentLocale = this.getService(UserInfoService).getUserSettings().locale;
        return (
            <SelectableItemGroup
                locale={currentLocale}
                I18n={this.I18n}
                multiSelect={this.props.multiSelect}
                style={{
                    marginTop: Styles.VerticalSpacingBetweenInGroupFormElements,
                    marginBottom: Styles.VerticalSpacingBetweenInGroupFormElements
                }}
                borderStyle={{
                    borderWidth: 0
                }}
                inPairs={true}
                onPress={(selectedLevelValue) => this.props.onToggle(selectedLevelValue)}
                selectionFn={(selectedUUID) => this.props.levels.some(l => l.uuid === selectedUUID && l.isSelected)}
                labelKey={this.props.levelType}
                mandatory={this.props.mandatory}
                labelValuePairs={valueLabelPairs}/>
        );
    }
}

export default AddressLevel;
