import React, {Component, View, StyleSheet, Text} from 'react-native';

class OptionList extends Component {

    static propTypes = {
        answer: React.PropTypes.object.isRequired,
    };

    static styles = StyleSheet.create({
        header: {
            height: 100,
            width: 100,
            alignSelf: 'center',
            textAlign: 'center',
            color: '#333333',
            marginBottom: 5,
        },
    });


    render() {
        return (
            <View>
                <Text style={OptionList.styles.header}>
                    {this.props.answer.choices}
                </Text>
            </View>
        );
    }
}

export default OptionList;