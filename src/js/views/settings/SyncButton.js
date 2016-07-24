import {StyleSheet, View, Text, TouchableHighlight, ProgressBarAndroid} from 'react-native';
import React, {Component} from 'react';
import BootstrapRegistry from '../../framework/bootstrap/BootstrapRegistry';
import Colors from '../primitives/Colors';

class SyncButton extends Component {

    constructor(props, context) {
        super(props, context);
        this.state = {syncing: false};
        this._triggerSync = this._triggerSync.bind(this);
    }

    static propTypes = {
        getService: React.PropTypes.func.isRequired
    };

    static styles = StyleSheet.create({
        itemWrapper: {
            flex: 1,
            borderRadius: 3,
            backgroundColor: Colors.Primary,
            width: 150,
            height: 30,
            margin: 5
        },
        item: {
            color: '#FFFFFF',
            textAlign: 'center',
            textAlignVertical: 'center',
            justifyContent: 'center',
            fontSize: 20,
            flex: 1
        }
    });

    _triggerSync() {
        this.setState({syncing: true});
        BootstrapRegistry.runTask("configLoad");
        setTimeout(() => this.setState({syncing: false}), 500);
    }


    render() {
        const renderBusyIndicator = () => this.state.syncing ? (<ProgressBarAndroid/>) : (<View/>);
        return (
            <View>
                <TouchableHighlight style={SyncButton.styles.itemWrapper}>
                    <Text onPress={this._triggerSync} style={SyncButton.styles.item}>
                        Sync Config
                    </Text>
                </TouchableHighlight>
                {renderBusyIndicator()}
            </View>
        );
    }
}

export default SyncButton;