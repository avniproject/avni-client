import {StyleSheet, View, Text, TouchableHighlight, ProgressBarAndroid} from 'react-native';
import React, {Component} from 'react';
import * as CHSStyles from '../primitives/GlobalStyles';
import ConfigService from '../../service/ConfigService';

class SyncButton extends Component {
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
        this.props.getService(ConfigService).getAllFilesAndSave();
        setTimeout(() => this.setState({syncing: false}), 500);
    }

    render() {
        const renderBusyIndicator = () => this.state.syncing ? (<ProgressBarAndroid/>) : (<View/>);
        return (
            <View style={{flexDirection: 'row', alignItems: 'flex-end'}}>
                <TouchableHighlight>
                    <View style={CHSStyles.Global.actionButtonWrapper}>
                        <Text onPress={this._triggerSync} style={CHSStyles.Global.actionButton}>
                            Sync Config
                        </Text>
                    </View>
                </TouchableHighlight>
                {renderBusyIndicator()}
            </View>
        );
    }
}

export default SyncButton;