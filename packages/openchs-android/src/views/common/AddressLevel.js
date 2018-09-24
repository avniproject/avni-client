import React from "react";
import _ from 'lodash';
import AbstractComponent from "../../framework/view/AbstractComponent";
import Colors from "../primitives/Colors";
import Reducers from "../../reducer";
import Fonts from "../primitives/Fonts";
import RadioGroup, {RadioLabelValue} from "../primitives/RadioGroup";
import General from "../../utility/General";
import Styles from "../primitives/Styles";
import Distances from "../primitives/Distances";

class AddressLevel extends AbstractComponent {
    static propTypes = {
        multiSelect: React.PropTypes.bool,
        levelType: React.PropTypes.string,
        validationError: React.PropTypes.object,
        mandatory: React.PropTypes.bool,
        onToggle: React.PropTypes.func
    };

    viewName() {
        return 'AddressLevel';
    }

    constructor(props, context) {
        super(props, context);
    }

    render() {
        General.logDebug(this.viewName(), 'render');
        const valueLabelPairs = this.props.levels.map(({uuid, name}) => new RadioLabelValue(name, uuid));
        return (
            <RadioGroup
                multiSelect={this.props.multiSelect}
                style={{
                    marginTop: Styles.VerticalSpacingBetweenInGroupFormElements,
                    marginBottom: Styles.VerticalSpacingBetweenInGroupFormElements
                }}
                borderStyle={{
                    borderWidth: 0
                }}
                inPairs={true}
                onPress={({label, value}) => this.props.onToggle(value)}
                selectionFn={(selectedUUID) => this.props.levels.some(l => l.uuid === selectedUUID && l.isSelected)}
                labelKey={this.props.levelType}
                mandatory={this.props.mandatory}
                validationError={this.props.validationError}
                labelValuePairs={valueLabelPairs}/>
        );
    }
}

export default AddressLevel;