import React, { Component, StyleSheet, Text, TextInput, View, Picker} from 'react-native';

const Item = Picker.Item;

class SettingsMultipeChoiceField extends Component {

    static propTypes = {
        onChangeValue: React.PropTypes.func.isRequired,
        defaultValue: React.PropTypes.string.isRequired,
        availableValues: React.PropTypes.array.isRequired,
    };

    static styles = StyleSheet.create({
        input: {
            height: 40,
            borderColor: 'gray',
            borderWidth: 1,
        },
    });

    render() {
        return (
            <View>
                <Text>
                    Locale
                </Text>
                <Picker
                    style={SettingsMultipeChoiceField.styles.input}
                    onChangeValue={this.props.onChangeValue}
                    selectedValue={this.props.defaultValue}
                    />
            </View>
        );
    }
}


export default SettingsMultipeChoiceField;