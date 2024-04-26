import PropTypes from 'prop-types';
import React from 'react';
import {Dimensions, StyleSheet, Text, TouchableNativeFeedback, View} from 'react-native';
import Fonts from '../primitives/Fonts';
import _ from 'lodash';
import AbstractComponent from "../../framework/view/AbstractComponent";
import MCIcon from "react-native-vector-icons/MaterialCommunityIcons";

const cardGap = 10;

class TitleNumberBlock extends AbstractComponent {
    static propTypes = {
        title: PropTypes.string,
        number: PropTypes.number,
        highlight: PropTypes.bool,
    };

    static styles = StyleSheet.create({
        container: {
            borderRadius: 6,
            elevation: 2,
            justifyContent: 'center',
            paddingLeft: 15,
            flexWrap: 'wrap',
            minHeight: 80,
            backgroundColor: 'white',
            marginTop: cardGap,
            width: (Dimensions.get('window').width - (cardGap * 4)) / 3,
        },
        titleStyle: {
            fontSize: 12,
        }
    });

    render() {
        const {textColor, numberColor, cardColor, title, onPress, number, index} = this.props;

        const textColorStyle = {color: textColor, opacity: 0.9};
        const numberColorStyle = {color: numberColor};
        return (
            <TouchableNativeFeedback onPress={() => onPress()}>
                <View
                    style={[TitleNumberBlock.styles.container, {
                        marginLeft: _.includes([1, 2], index) ? cardGap : 0,
                        backgroundColor: cardColor
                    }]}>
                    <View style={{flexDirection: 'column', width: '100%'}}>
                        <Text style={[Fonts.typography("paperFontBody2"), numberColorStyle, {fontSize: 20, marginTop: 20}]}>
                            {number}
                        </Text>
                        <View style={{marginTop: 5}}>
                            <Text
                                style={[TitleNumberBlock.styles.titleStyle, Fonts.typography("paperFontBody2"), textColorStyle]}>
                                {this.I18n.t(title)}
                            </Text>
                        </View>
                        <View style={{backgroundColor: cardColor, borderRadius: 6, alignSelf: "flex-end"}}>
                            <MCIcon name={'chevron-right'} size={30} color={numberColor} style={{opacity: 0.8}}/>
                        </View>
                    </View>
                </View>
            </TouchableNativeFeedback>
        );
    }
}

export default TitleNumberBlock;
