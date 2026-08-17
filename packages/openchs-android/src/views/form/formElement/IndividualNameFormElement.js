import {View} from 'react-native';
import PropTypes from 'prop-types';
import React from 'react';
import AbstractComponent from '../../../framework/view/AbstractComponent';
import TextFormElement from "./TextFormElement";
import StaticFormElement from "../../viewmodel/StaticFormElement";
import AbstractDataEntryState from "../../../state/AbstractDataEntryState";
import {  PrimitiveValue  } from 'avni-models';
import {  Individual  } from 'avni-models';
import {Actions} from "../../../action/individual/PersonRegisterActions";
import Distances from "../../primitives/Distances";
import ValidationErrorMessage from "../ValidationErrorMessage";
import Colors from "../../primitives/Colors";
import _ from "lodash";

const outlinedFieldStyles = {
    containerStyle: {
        flexDirection: 'column',
        justifyContent: 'flex-start',
        marginTop: Distances.VerticalSpacingBetweenFormElements
    },
    labelStyle: {
        marginBottom: 4
    },
    inputStyle: {
        borderWidth: 1,
        borderColor: Colors.InputBorderNormal,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 4
    },
    underlineColorAndroid: 'transparent'
};

class IndividualNameFormElement extends AbstractComponent {
    static propTypes = {
        state: PropTypes.object.isRequired
    };

    constructor(props, context) {
        super(props, context);
    }

    render() {
        return (
            <View>
                <TextFormElement actionName={Actions.REGISTRATION_ENTER_FIRST_NAME}
                                 element={new StaticFormElement('firstName', true)}
                                 validationResult={AbstractDataEntryState.getValidationError(this.props.state, Individual.validationKeys.FIRST_NAME)}
                                 value={new PrimitiveValue(this.props.state.individual.firstName)}
                                 containerStyle={outlinedFieldStyles.containerStyle}
                                 labelStyle={outlinedFieldStyles.labelStyle}
                                 inputStyle={outlinedFieldStyles.inputStyle}
                                 underlineColorAndroid={outlinedFieldStyles.underlineColorAndroid}
                                 multiline={false}
                                 helpText={_.get(this.props.state.individual, 'subjectType.nameHelpText')}
                />
                {this.props.state.individual.subjectType.allowMiddleName &&
                <TextFormElement actionName={Actions.REGISTRATION_ENTER_MIDDLE_NAME}
                                 element={new StaticFormElement('middleName', false)}
                                 validationResult={AbstractDataEntryState.getValidationError(this.props.state, Individual.validationKeys.MIDDLE_NAME)}
                                 value={new PrimitiveValue(this.props.state.individual.middleName)}
                                 containerStyle={outlinedFieldStyles.containerStyle}
                                 labelStyle={outlinedFieldStyles.labelStyle}
                                 inputStyle={outlinedFieldStyles.inputStyle}
                                 underlineColorAndroid={outlinedFieldStyles.underlineColorAndroid}
                                 multiline={false}
                />}
                <TextFormElement actionName={Actions.REGISTRATION_ENTER_LAST_NAME}
                                 element={new StaticFormElement('lastName', !this.props.state.individual.subjectType.lastNameOptional)}
                                 validationResult={AbstractDataEntryState.getValidationError(this.props.state, Individual.validationKeys.LAST_NAME)}
                                 value={new PrimitiveValue(this.props.state.individual.lastName)}
                                 containerStyle={outlinedFieldStyles.containerStyle}
                                 labelStyle={outlinedFieldStyles.labelStyle}
                                 inputStyle={outlinedFieldStyles.inputStyle}
                                 underlineColorAndroid={outlinedFieldStyles.underlineColorAndroid}
                                 multiline={false}
                />
                <ValidationErrorMessage validationResult={AbstractDataEntryState.getValidationError(this.props.state, Individual.validationKeys.NAME)}/>
            </View>
        );
    }
}

export default IndividualNameFormElement;
