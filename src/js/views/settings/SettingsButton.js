import {StyleSheet, View, Text, TouchableHighlight} from 'react-native';
import React, {Component} from 'react';
import GlobalStyles from "../primitives/GlobalStyles";
import AbstractComponent from "../../framework/view/AbstractComponent";
import MessageService from '../../service/MessageService';

class SettingsButton extends AbstractComponent {
    constructor(props, context) {
        super(props, context);
        this.I18n = context.getService(MessageService).getI18n();
    }

    render() {
        return (
            <View style={{flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end'}}>
                <TouchableHighlight>
                    <View style={GlobalStyles.actionButtonWrapper}>
                        {this.renderComponent(this.props.loading, (
                            <Text onPress={this.props.onPress}
                                  style={GlobalStyles.actionButton}>{this.I18n.t(this.props.buttonText)}
                            </Text>))}
                    </View>
                </TouchableHighlight>
            </View>
        );
    }
}

export default SettingsButton;