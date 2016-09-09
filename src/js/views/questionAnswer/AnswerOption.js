import {Text, StyleSheet, View, Image, TouchableHighlight} from 'react-native';
import React, {Component} from 'react';
import MessageService from '../../service/MessageService';
import Colors from '../primitives/Colors';

class AnswerOption extends Component {
    constructor(props, context) {
        super(props, context);
        this.I18n = context.getService(MessageService).getI18n();
    }

    static propTypes = {
        answer: React.PropTypes.string.isRequired,
        isSelected: React.PropTypes.bool.isRequired
    };

    static contextTypes = {
        getService: React.PropTypes.func.isRequired
    };

    static styles = StyleSheet.create({
        answerRow: {
            marginTop: 10,
            height: 45,
            marginLeft: 15,
            marginRight: 15,
            flex: 1,
            flexDirection: 'row',
            backgroundColor: Colors.Primary
        },
        item: {
            color: '#ffffff',
            margin: 10,
            textAlign: 'left',
            textAlignVertical: 'center',
            fontSize: 18,
            flex: 4
        },
        checkImageContainer: {
            flex: 1,
            flexDirection: 'row'
        },
        checkImage: {
            resizeMode: 'contain',
            height: 45,
            width: 60,
        },
        checkImagePlaceholder: {
            flex: 1
        }
    });

    // TODO: Incorporate android image adding in the build script rather than these paths
    displayCheckImage() {
        if (this.props.isSelected) {
            return (
                <TouchableHighlight onPress={() => this.props.optionPressed(this.props.answer)}>
                    <Image style={AnswerOption.styles.checkImage}
                           source={require('../../../../android/app/src/main/res/mipmap-mdpi/check.png')}
                    />
                </TouchableHighlight>);
        } else {
            return (<Text style={AnswerOption.styles.checkImagePlaceholder} onPress={() => this.props.optionPressed(this.props.answer)}/>);
        }
    }

    render() {
        return (
            <View style={AnswerOption.styles.answerRow}>
                <Text style={AnswerOption.styles.item} onPress={() => this.props.optionPressed(this.props.answer)}>
                    {this.I18n.t(this.props.answer)}
                </Text>
                <View style={AnswerOption.styles.checkImageContainer}>
                    {this.displayCheckImage()}
                </View>
            </View>
        );
    }
}

export default AnswerOption;