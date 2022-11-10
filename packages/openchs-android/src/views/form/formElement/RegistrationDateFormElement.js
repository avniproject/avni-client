import PropTypes from 'prop-types';
import React from 'react';
import AbstractComponent from '../../../framework/view/AbstractComponent';
import StaticFormElement from '../../viewmodel/StaticFormElement';
import {PrimitiveValue} from 'avni-models';
import {Actions} from '../../../action/individual/IndividualRegisterActions';
import DateFormElement from './DateFormElement';

class RegistrationDateFormElement extends AbstractComponent {
    static propTypes = {
        date: PropTypes.object.isRequired,
        validationResult: PropTypes.object
    };

    constructor(props, context) {
        super(props, context);
    }

    render() {
        return (
            <DateFormElement actionName={Actions.REGISTRATION_ENTER_REGISTRATION_DATE}
                             element={new StaticFormElement('registrationDate', true)}
                             dateValue={new PrimitiveValue(this.props.date)}
                             validationResult={this.props.validationResult}/>
        );
    }
}

export default RegistrationDateFormElement;
