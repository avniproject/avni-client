import React from "react"; import PropTypes from 'prop-types';
import AbstractComponent from "../../../framework/view/AbstractComponent";
import AbstractDataEntryState from "../../../state/AbstractDataEntryState";
import Distances from "../../primitives/Distances";
import Individual from "../../../../../openchs-models/src/Individual";
import RadioGroup, {RadioLabelValue} from "../../primitives/RadioGroup";
import {Actions} from "../../../action/individual/IndividualRegisterActions";

class GenderFormElement extends AbstractComponent {
    static propTypes = {
        state: PropTypes.object.isRequired
    };

    constructor(props, context) {
        super(props, context);
    }

    render() {
        return (
            <RadioGroup
                onPress={({value}) => this.dispatchAction(Actions.REGISTRATION_ENTER_GENDER, {value: value})}
                labelValuePairs={this.props.state.genders.map((gender) => new RadioLabelValue(gender.name, gender))}
                labelKey="gender"
                selectionFn={(gender) => gender.equals(this.props.state.individual.gender)}
                validationError={AbstractDataEntryState.getValidationError(this.props.state, Individual.validationKeys.GENDER)}
                style={{marginTop: Distances.VerticalSpacingBetweenFormElements}}
                mandatory={true}
            />
        );
    }
}

export default GenderFormElement;