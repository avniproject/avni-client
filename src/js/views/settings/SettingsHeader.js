import {StyleSheet, Text, View, TouchableHighlight} from 'react-native';
import React, {Component} from 'react';
import TypedTransition from "../../framework/routing/TypedTransition";

class SettingsHeader extends Component {

    constructor(props, context) {
        super(props, context);
        this.I18n = context.getService("messageService").getI18n();
    }

    static contextTypes = {
        getService: React.PropTypes.func.isRequired
    };

    static styles = StyleSheet.create({
        main: {
            flexDirection: 'row',
            height: 60,
            marginBottom: 5
        },
        close: {
            color: '#333333',
            fontSize: 26,
            textAlignVertical: 'center',
            fontWeight: 'bold'
        },
        label: {
            flex: 0.90,
            textAlignVertical: 'center',
            textAlign: 'center',
            fontWeight: 'bold',
            color: '#333333',
            fontSize: 26
        }
    });

    static propTypes = {
        parent: React.PropTypes.object.isRequired
    };

    onClosePress = () => {
        TypedTransition.from(this.props.parent).goBack();
    };

    render() {
        return (
            <View style={SettingsHeader.styles.main}>
                <Text style={SettingsHeader.styles.label}>
                    {this.I18n.t('settings')}
                </Text>
                <TouchableHighlight>
                    <Text style={SettingsHeader.styles.close} onPress={this.onClosePress}>
                        {this.I18n.t('close')}
                    </Text>
                </TouchableHighlight>
            </View>
        );
    }
}

export default SettingsHeader;