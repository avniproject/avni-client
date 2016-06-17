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
            width: 100,
            borderColor: 'gray',
            borderWidth: 1
        }
    });

    render() {
        const pickerItems = this.props.availableValues.map((item) => <Item key={item.option}
                                                                           label={item.option}
                                                                           value={item.locale}/>);
        return (
            <View>
                <Text style={SettingsForm.styles.field}>
                    Locale
                </Text>
                <Picker
                    style={SettingsMultipleChoiceField.styles.input}
                    onValueChange={this.props.onChangeSelection}
                    selectedValue={this.props.selectedValue}>
                    {pickerItems}
                </Picker>
            </View>
        );
    }
}

export default SettingsMultipleChoiceField;