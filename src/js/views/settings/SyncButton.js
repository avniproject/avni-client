import {StyleSheet, View, Text, TouchableHighlight, ProgressBarAndroid} from 'react-native';
import React, {Component} from 'react';
import * as CHSStyles from '../primitives/GlobalStyles';
import AbstractComponent from "../../framework/view/AbstractComponent";
import MessageService from '../../service/MessageService';
import Actions from '../../action';

class SyncButton extends AbstractComponent {
    constructor(props, context) {
        super(props, context);
        this.state = {syncing: false};
        this._triggerSync = this._triggerSync.bind(this);
        this.I18n = context.getService(MessageService).getI18n();
    }

    static propTypes = {
        getService: React.PropTypes.func.isRequired
    };


    _triggerSync() {
        this.setState({syncing: true});
        this.dispatchAction(Actions.GET_CONFIG, {cb: ()=> this.setState({syncing: false})});
    }

    render() {
        return (
            <View style={{flexDirection: 'row', alignItems: 'flex-end'}}>
                <TouchableHighlight>
                    <View style={CHSStyles.Global.actionButtonWrapper}>
                        {this.renderComponent(this.state.syncing, (
                            <Text onPress={this._triggerSync}
                                  style={CHSStyles.Global.actionButton}>{this.I18n.t("syncConfig")}
                            </Text>))}
                    </View>
                </TouchableHighlight>
            </View>
        );
    }
}

export default SyncButton;