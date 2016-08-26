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
        defaultValue: React.PropTypes.string.isRequired
    };

    constructor(props, context) {
        super(props, context);
        this.I18n = context.getService(MessageService).getI18n();
    }

    render() {
        return (
            <View style={SettingsView.styles.formItem}>
                <Text style={SettingsView.styles.formItemLabel}>{this.I18n.t("serverURL")}</Text>
                <TextInput
                    style={[SettingsView.styles.formItemInput, {fontSize: 20}]}
                    onChangeText={this.props.onChangeText}
                    defaultValue={this.props.defaultValue}
                />
            </View>
        );
    }
}

export default SettingsFormField;