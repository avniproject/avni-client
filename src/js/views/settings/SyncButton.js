import {StyleSheet, View, Text, TouchableHighlight, ProgressBarAndroid} from 'react-native';
import React, {Component} from 'react';
import * as CHSStyles from '../primitives/GlobalStyles';
import ConfigService from '../../service/ConfigService';
import AbstractComponent from "../../framework/view/AbstractComponent";

class SyncButton extends AbstractComponent {
    constructor(props, context) {
        super(props, context);
        this.state = {syncing: false};
        this._triggerSync = this._triggerSync.bind(this);
    }

    static propTypes = {
        getService: React.PropTypes.func.isRequired
    };

    _triggerSync() {
        this.setState({syncing: true});
        this.props.getService(ConfigService).getAllFilesAndSave(()=>this.setState({syncing: false}));
    }

    render() {
        this.loading = this.state.syncing;
        return (
            <View style={{flexDirection: 'row', alignItems: 'flex-end'}}>
                <TouchableHighlight>
                    <View style={CHSStyles.Global.actionButtonWrapper}>
                        {this.renderComponent((<Text onPress={this._triggerSync} style={CHSStyles.Global.actionButton}>
                            Sync Config
                        </Text>))}
                    </View>
                </TouchableHighlight>
            </View>
        );
    }
}

export default SyncButton;