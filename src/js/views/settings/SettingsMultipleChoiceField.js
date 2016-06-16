import React, {Component, StyleSheet, Text, TextInput, View, Picker} from 'react-native';

const Item = Picker.Item;

class SettingsMultipeChoiceField extends Component {

    static propTypes = {
        onChangeSelection: React.PropTypes.func.isRequired,
        defaultSelection: React.PropTypes.string.isRequired,
        availableValues: React.PropTypes.array.isRequired,
    };

    static styles = StyleSheet.create({
        input: {
            height: 40,
            width: 100,
            borderColor: 'gray',
            borderWidth: 1,
        },
    });

    render() {
        const pickerItems = this.props.availableValues.map((item) => <Item label={item.option}
                                                                           value={item.locale}/>);
        return (
            <View>
                <Text>
                    Locale
                </Text>
                <Picker
                    style={SettingsMultipeChoiceField.styles.input}
                    onChangeValue={this.props.onChangeSelection}
                    selectedValue={this.props.selectedValue}>
                    {pickerItems}
                </Picker>
            </View>
        );
    }
}


export default SettingsMultipeChoiceField;