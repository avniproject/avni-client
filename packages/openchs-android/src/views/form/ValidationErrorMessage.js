import {View} from 'react-native';
import PropTypes from 'prop-types';
import React from 'react';
import AbstractComponent from '../../framework/view/AbstractComponent';
import {Text} from "native-base";
import _ from "lodash";
import Colors from '../primitives/Colors';

class ValidationErrorMessage extends AbstractComponent {
    static propTypes = {
        validationResult: PropTypes.object
    };

    constructor(props, context) {
        super(props, context);
    }

    shouldComponentUpdate(nextProps, nextState, nextContext) {
        return this.props.validationResult !== nextProps.validationResult;
    }

    render() {
        return _.isNil(this.props.validationResult) || this.props.validationResult.success ? <View/> : <Text style={{color: Colors.ValidationError, flex: 0.3}}>{this.I18n.t(this.props.validationResult.messageKey, this.props.validationResult.extra)}</Text>;
    }
}

export default ValidationErrorMessage;
