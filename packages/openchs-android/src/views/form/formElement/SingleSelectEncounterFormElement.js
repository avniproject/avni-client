import React from 'react';
import PropTypes from "prop-types";
import _ from "lodash";
import Distances from "../../primitives/Distances";
import RadioGroup from "../../primitives/RadioGroup";
import {View} from "react-native";
import EncounterSelectFormElement from "./EncounterSelectFormElement";

class SingleSelectEncounterFormElement extends EncounterSelectFormElement {

    static propTypes = {
        element: PropTypes.object.isRequired,
        actionName: PropTypes.string.isRequired,
        value: PropTypes.object,
        validationResult: PropTypes.object,
        subjectUUID: PropTypes.string,
    };

    static defaultProps = {
        style: {}
    };

    constructor(props, context) {
        super(props, context);
    }

    render() {
        const selectedEncounterUUID = _.get(this.props.value, 'answer');
        const valueLabelPairs = this.getValueLabelPairs();
        return (
            <View style={{flexDirection: 'column', paddingBottom: Distances.ScaledVerticalSpacingBetweenOptionItems}}>
                <RadioGroup
                    multiSelect={false}
                    inPairs={true}
                    onPress={({label, value}) => this.toggleFormElementAnswerSelection(value)}
                    selectionFn={(encounterUUID) => _.isEmpty(selectedEncounterUUID) ? false : selectedEncounterUUID === encounterUUID}
                    labelKey={this.props.element.name}
                    mandatory={this.props.element.mandatory}
                    validationError={this.props.validationResult}
                    labelValuePairs={valueLabelPairs}/>
            </View>
        )
    }


}

export default SingleSelectEncounterFormElement;
