import {View} from 'react-native';
import React from 'react';
import AbstractComponent from '../../framework/view/AbstractComponent';
import {Text} from "native-base";
import _ from "lodash";
import Colors from '../primitives/Colors';

class ValidationErrorMessage extends AbstractComponent {
    static propTypes = {
        validationResult: React.PropTypes.object
    };

    constructor(props, context) {
        super(props, context);
    }

    render() {
        return _.isNil(this.props.validationResult) || this.props.validationResult.success ? <View/> : <Text style={{color: Colors.ValidationError, flex: 0.3}}>{this.I18n.t(this.props.validationResult.messageKey, this.props.validationResult.extra)}</Text>;
    }
}

export default ValidationErrorMessage;