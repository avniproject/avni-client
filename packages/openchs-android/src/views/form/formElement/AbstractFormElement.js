import AbstractComponent from "../../../framework/view/AbstractComponent";
import _ from 'lodash';
import Colors from '../../primitives/Colors';
import PropTypes from 'prop-types';
import React from "react";
import {StyleSheet, View} from "react-native";
import {Text} from "native-base";
import Styles from "../../primitives/Styles";


class AbstractFormElement extends AbstractComponent {
    constructor(props, context) {
        super(props, context);
    }

    get label() {
        const mandatoryText = this.props.element.mandatory ? <Text style={{color: Colors.ValidationError}}> * </Text> :
            <Text></Text>;
        return <Text style={Styles.formLabel}>{this.I18n.t(this.props.element.name)}{mandatoryText}</Text>;
    }

    get hasNoValidationError() {
        return _.isNil(this.props.validationResult) || this.props.validationResult.success;
    }

    get isReadOnly() {
        return this.props.element.editable === false;
    }

    showEmptyReadOnly() {
        return (
            <Text style={[Styles.formBodyText, {color: Colors.InputNormal, paddingVertical: 5}]}>
                {this.I18n.t('Not Known Yet')}
            </Text>
        );
    }

    // Read-only render for multi-value media/file elements: the stored values, no input slots.
    // Relies on the subclass's showMedia(uri) (clear button suppressed when isReadOnly).
    renderReadOnlyMediaList(uris) {
        if (_.isEmpty(uris)) return this.showEmptyReadOnly();
        return _.map(uris, (uri, index) => (
            <View key={index} style={{marginBottom: 3}}>
                {this.showMedia(uri)}
                <View style={{flex: 1, borderColor: Colors.BlackBackground, borderBottomWidth: StyleSheet.hairlineWidth, opacity: 0.1}}/>
            </View>
        ));
    }

    get borderColor() {
        return this.hasNoValidationError ? Colors.InputBorderNormal : Colors.ValidationError;
    }

    get textColor() {
        return this.hasNoValidationError ? Colors.InputNormal : Colors.ValidationError;
    }

    renderFormElement() {
        return (<View/>)
    }

    renderView() {
        return (<View/>);
    }

    render() {
        return this.showElement ? this.renderFormElement() : this.renderView();
    }
}

export default AbstractFormElement;