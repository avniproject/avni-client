import React from "react";
import _ from 'lodash';
import AbstractComponent from "../../framework/view/AbstractComponent";
import Colors from "../primitives/Colors";
import Reducers from "../../reducer";
import Fonts from "../primitives/Fonts";
import RadioGroup, {RadioLabelValue} from "../primitives/RadioGroup";
import General from "../../utility/General";
import Styles from "../primitives/Styles";
import {Actions, AddressLevelsActions, AddressLevelActionMap} from '../../action/common/AddressLevelsActions';

class AddressLevel extends AbstractComponent {
    static propTypes = {
        multiSelect: React.PropTypes.bool,
        levelType: React.PropTypes.string,
        validationError: React.PropTypes.object,
        mandatory: React.PropTypes.bool
    };

    viewName() {
        return 'AddressLevel';
    }

    constructor(props, context) {
        super(props, context);
        this.inputTextStyle = {fontSize: Fonts.Large, marginLeft: 11, color: Colors.InputNormal};
        this.toggleAddressLevelSelection = this.toggleAddressLevelSelection.bind(this);
    }

    toggleAddressLevelSelection(addressLevelUuid, levelType) {
        this.dispatchFn((dispatch) => {
            dispatch({
                type: Actions.ON_SELECT,
                selectedLevel: addressLevelUuid,
                levelType: levelType,
                exclusive: !this.props.multiSelect
            });
            setTimeout(() => this.props.onSelect(), 400);
        });
    }

    render() {
        General.logDebug(this.viewName(), 'render');
        const valueLabelPairs = this.props.levels.map(({uuid, name}) => new RadioLabelValue(name, uuid));
        return (
            <RadioGroup
                multiSelect={this.props.multiSelect}
                style={{
                    marginTop: Styles.VerticalSpacingBetweenFormElements,
                    marginBottom: Styles.VerticalSpacingBetweenFormElements
                }}
                inPairs={true}
                onPress={({label, value}) => this.toggleAddressLevelSelection(value, this.props.levelType)}
                selectionFn={(selectedUUID) => this.props.levels.some(l => l.uuid === selectedUUID && l.isSelected)}
                labelKey={this.props.levelType}
                mandatory={this.props.mandatory}
                validationError={this.props.validationError}
                labelValuePairs={valueLabelPairs}/>
        );
    }
}

export default AddressLevel;