import PropTypes from 'prop-types';
import React from 'react';
import {Dimensions, StyleSheet, Text, TouchableNativeFeedback, View} from 'react-native';
import Fonts from '../primitives/Fonts';
import _ from 'lodash';
import AbstractComponent from "../../framework/view/AbstractComponent";

const cardGap = 10;

class TitleNumberBlock extends AbstractComponent {
    static propTypes = {
        title: PropTypes.string,
        number: PropTypes.number,
        highlight: PropTypes.bool,
    };

    static styles = StyleSheet.create({
        container: {
            borderRadius: 8,
            elevation: 2,
            justifyContent: 'center',
            paddingHorizontal: 10,
            flexWrap: 'wrap',
            minHeight: 80,
            backgroundColor: 'white',
            marginTop: cardGap,
            width: (Dimensions.get('window').width - cardGap * 3) / 3,
        },
        titleStyle: {
            fontSize: 12,
        }
    });

    render() {
        const textColor = {color: this.props.textColor, opacity: 0.9};
        const numberColor = {color: this.props.numberColor};
        const backgroundColor = this.props.cardColor;
        const index = this.props.index;
        return (
            <TouchableNativeFeedback onPress={() => this.props.onPress()}>
                <View
                    style={[TitleNumberBlock.styles.container, {
                        marginLeft: _.includes([1, 2], index) ? cardGap / 2 : 0,
                        backgroundColor
                    }]}>
                    <View style={{flexDirection: 'column'}}>
                        <Text style={[Fonts.typography("paperFontBody2"), numberColor, {fontSize: 20}]}>
                            {this.props.number}
                        </Text>
                        <View style={{marginTop: 5}}>
                            <Text
                                style={[TitleNumberBlock.styles.titleStyle, Fonts.typography("paperFontBody2"), textColor]}>
                                {this.I18n.t(this.props.title)}
                            </Text>
                        </View>
                    </View>
                </View>
            </TouchableNativeFeedback>
        );
    }
}

export default TitleNumberBlock;
