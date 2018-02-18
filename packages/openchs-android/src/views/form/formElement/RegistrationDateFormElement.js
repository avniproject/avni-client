import React from "react"; import PropTypes from 'prop-types';
import AbstractComponent from "../../../framework/view/AbstractComponent";
import StaticFormElement from "../../viewmodel/StaticFormElement";
import PrimitiveValue from "../../../../../openchs-models/src/observation/PrimitiveValue";
import AbstractDataEntryState from "../../../state/AbstractDataEntryState";
import Individual from "../../../../../openchs-models/src/Individual";
import {Actions} from "../../../action/individual/IndividualRegisterActions";
import DateFormElement from "./DateFormElement";

class RegistrationDateFormElement extends AbstractComponent {
    static propTypes = {
        state: PropTypes.object.isRequired
    };

    constructor(props, context) {
        super(props, context);
    }

    render() {
        return (
            <DateFormElement actionName={Actions.REGISTRATION_ENTER_REGISTRATION_DATE}
                             element={new StaticFormElement('registrationDate', true)}
                             dateValue={new PrimitiveValue(this.props.state.individual.registrationDate)}
                             validationResult={AbstractDataEntryState.getValidationError(this.props.state, Individual.validationKeys.REGISTRATION_DATE)}/>
        );
    }
}

export default RegistrationDateFormElement;