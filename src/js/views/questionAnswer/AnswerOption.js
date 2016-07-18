import {Text, StyleSheet, View, Image} from 'react-native';
import React, {Component} from 'react';
import I18n from '../../utility/Messages'

class AnswerOption extends Component {
    static propTypes = {
        answer: React.PropTypes.string.isRequired,
        isSelected: React.PropTypes.bool.isRequired
    };
    
    static styles = StyleSheet.create({
        answerRow: {
            marginTop: 10,
            height: 45,
            marginLeft: 30,
            marginRight: 30,
            flex: 1,
            flexDirection: 'row',
            backgroundColor: '#e93a2c'
        },
        item: {
            color: '#ffffff',
            margin: 10,
            textAlign: 'left',
            textAlignVertical: 'center',
            fontSize: 18,
            flex: 0.7
        },
        checkImage: {
            flex: 0.2,
            resizeMode: 'contain',
            height: 45
        }
    });

    // TODO: Incorporate android image adding in the build script rather than these paths
    displayCheckImage() {
        if (this.props.isSelected) {
            return (<Image style={AnswerOption.styles.checkImage}
                           source={require('../../../../android/app/src/main/res/mipmap-mdpi/check.png')}
            />)
        }
    }

    render() {
        return (
            <View style={AnswerOption.styles.answerRow}>
                 <Text style={AnswerOption.styles.item} onPress={() => this.props.optionPressed(this.props.answer)}>
                    {I18n.t(this.props.answer)}
                </Text>
                {this.displayCheckImage()}
            </View>
        );
    }
}

export default AnswerOption;