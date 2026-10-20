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
import _ from "lodash";

class IndividualNameFormElement extends AbstractComponent {
    static propTypes = {
        state: PropTypes.object.isRequired,
        locked: PropTypes.shape({firstName: PropTypes.bool, middleName: PropTypes.bool, lastName: PropTypes.bool})
    };

    constructor(props, context) {
        super(props, context);
    }

    // A locked part shows as plain text: TextFormElement draws a read-only element that way. Each part locks on
    // its own, since the ABHA may not give them all.
    nameElement(name, mandatory) {
        const element = new StaticFormElement(name, mandatory);
        return _.get(this.props.locked, name) ? Object.assign(element, {editable: false}) : element;
    }

    render() {
        return (
            <View>
                <TextFormElement actionName={Actions.REGISTRATION_ENTER_FIRST_NAME}
                                 element={this.nameElement('firstName', true)}
                                 validationResult={AbstractDataEntryState.getValidationError(this.props.state, Individual.validationKeys.FIRST_NAME)}
                                 value={new PrimitiveValue(this.props.state.individual.firstName)}
                                 style={{marginTop: Distances.VerticalSpacingBetweenFormElements}}
                                 multiline={false}
                                 helpText={_.get(this.props.state.individual, 'subjectType.nameHelpText')}
                />
                {this.props.state.individual.subjectType.allowMiddleName &&
                <TextFormElement actionName={Actions.REGISTRATION_ENTER_MIDDLE_NAME}
                                 element={this.nameElement('middleName', false)}
                                 validationResult={AbstractDataEntryState.getValidationError(this.props.state, Individual.validationKeys.MIDDLE_NAME)}
                                 value={new PrimitiveValue(this.props.state.individual.middleName)}
                                 style={{marginTop: Distances.VerticalSpacingBetweenFormElements}}
                                 multiline={false}
                />}
                <TextFormElement actionName={Actions.REGISTRATION_ENTER_LAST_NAME}
                                 element={this.nameElement('lastName', !this.props.state.individual.subjectType.lastNameOptional)}
                                 validationResult={AbstractDataEntryState.getValidationError(this.props.state, Individual.validationKeys.LAST_NAME)}
                                 value={new PrimitiveValue(this.props.state.individual.lastName)}
                                 style={{marginTop: Distances.VerticalSpacingBetweenFormElements}}
                                 multiline={false}
                />
                <ValidationErrorMessage validationResult={AbstractDataEntryState.getValidationError(this.props.state, Individual.validationKeys.NAME)}/>
            </View>
        );
    }
}

export default IndividualNameFormElement;
