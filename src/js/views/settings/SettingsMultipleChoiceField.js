import React, {Component, StyleSheet, Text, TextInput, View, Picker} from 'react-native';
import SettingsForm from './SettingsForm';

const Item = Picker.Item;

class SettingsMultipleChoiceField extends Component {
    static propTypes = {
        onChangeSelection: React.PropTypes.func.isRequired,
        selectedValue: React.PropTypes.string.isRequired,
        availableValues: React.PropTypes.object.isRequired
    };

    static styles = StyleSheet.create({
        input: {
            height: 40,
            width: 200,
            borderColor: 'gray',
            borderWidth: 1
        }
    });

    render() {
        const pickerItems = this.props.availableValues.map((item) => <Item key={item.option}
                                                                           label={item.option}
                                                                           value={item.locale}/>);
        return (
            <View style={[{flex: 1, flexDirection: 'row'}, SettingsForm.styles.formItem]}>
                <Text style={[SettingsForm.styles.fieldLabel, {flex: 0.2}]}>
                    Locale
                </Text>
                <Picker
                    style={[SettingsMultipleChoiceField.styles.input, {flex: 0.7}]}
                    onValueChange={this.props.onChangeSelection}
                    selectedValue={this.props.selectedValue}>
                    {pickerItems}
                </Picker>
            </View>
        );
    }
}

export default SettingsMultipleChoiceField;