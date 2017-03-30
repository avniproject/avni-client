import  {StyleSheet, Text, TextInput, View} from 'react-native';
import React, {Component} from 'react';
import SettingsView from './SettingsView';
import MessageService from '../../service/MessageService';

class SettingsFormField extends Component {
    static contextTypes = {
        getService: React.PropTypes.func.isRequired
    };

    static propTypes = {
        onChangeText: React.PropTypes.func.isRequired,
        defaultValue: React.PropTypes.string.isRequired,
        formLabel: React.PropTypes.string.isRequired
    };

    constructor(props, context) {
        super(props, context);
        this.I18n = context.getService(MessageService).getI18n();
    }

    render() {
        return (
            <View>
                <Text>{this.props.formLabel}</Text>
                <TextInput
                    style={{fontSize: 20}}
                    onChangeText={this.props.onChangeText}
                    defaultValue={this.props.defaultValue}
                />
            </View>
        );
    }
}

export default SettingsFormField;