import {StyleSheet, View, Text, TouchableHighlight, Alert} from 'react-native';
import React, {Component} from 'react';
import * as CHSStyles from '../primitives/GlobalStyles';
import AbstractComponent from "../../framework/view/AbstractComponent";
import MessageService from '../../service/MessageService';
import Actions from '../../action';

class SyncButton extends AbstractComponent {
    constructor(props, context) {
        super(props, context);
        this.state = {syncing: false, error: false};
        this._triggerSync = this._triggerSync.bind(this);
        this.I18n = context.getService(MessageService).getI18n();
    }

    static propTypes = {
        getService: React.PropTypes.func.isRequired
    };


    _triggerSync() {
        this.setState({syncing: true});
        this.dispatchAction(Actions.GET_CONFIG, {
            cb: ()=> this.setState({syncing: false}),
            errorHandler: (message)=> {
                this.setState({error: true, errorMessage: `${message}`, syncing: false})
            }
        });
    }

    _syncFail() {
        if (this.state.error) {
            return (Alert.alert(this.I18n.t("syncError"), this.state.errorMessage,
                [
                    {
                        text: 'Ok', onPress: () => {
                        this.setState({error: false, errorMessage: undefined});
                    }
                    }
                ]
            ));
        }
    }

    render() {
        return (
            <View style={{flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end'}}>
                {this._syncFail()}
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