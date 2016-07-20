import {StyleSheet, Text, TextInput, View, Picker} from 'react-native';
import React, {Component} from 'react';
import SettingsView from './SettingsView';

const Item = Picker.Item;

class SettingsMultipleChoiceField extends Component {
    static propTypes = {
        onChangeSelection: React.PropTypes.func.isRequired,
        selectedValue: React.PropTypes.string.isRequired,
        availableValues: React.PropTypes.object.isRequired
    };

    render() {
        const pickerItems = this.props.availableValues.map((item) => <Item key={item.option}
                                                                           label={item.option}
                                                                           value={item.locale}/>);
        return (
            <View style={SettingsView.styles.formItem}>
                <Text style={SettingsView.styles.formItemLabel}>Locale</Text>
                <Picker
                    style={SettingsView.styles.formItemInput}
                    onValueChange={this.props.onChangeSelection}
                    selectedValue={this.props.selectedValue}>
                    {pickerItems}
                </Picker>
            </View>
        );
    }
}

export default SettingsMultipleChoiceField;