import PropTypes from 'prop-types';
import React, {Component} from 'react';
import {View, Text, StyleSheet, TouchableNativeFeedback} from 'react-native';
import Fonts from '../primitives/Fonts';
import _ from 'lodash';
import DGS from '../primitives/DynamicGlobalStyles';
import AbstractComponent from "../../framework/view/AbstractComponent";
import Colors from "../primitives/Colors";

class TitleNumberBlock extends AbstractComponent {
    static propTypes = {
        title: PropTypes.string,
        number: PropTypes.number,
        highlight: PropTypes.bool,
        backgroundColor: PropTypes.string,
    };

    static styles = StyleSheet.create({
        container: {
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            flexWrap: 'wrap',
            width: DGS.resizeWidth(190),
            minHeight: DGS.resizeHeight(150),
            borderRadius:10,
            marginBottom:10,
            shadowColor: 'black',
            shadowOpacity: 0.26,
            shadowOffset: { width: 0, height: 2},
            shadowRadius: 10,
            elevation: 4,
        },
        title: {
            color: Colors.TextOnPrimaryColor,
        },
        highlight: {
            color: "#960000",
        }
    });

    render() {
        const textColor = TitleNumberBlock.styles.title;
        return (
            <TouchableNativeFeedback onPress={() => this.props.onPress()}>
                <View style={{...TitleNumberBlock.styles.container, backgroundColor: this.props.backgroundColor}}>
                    <Text style={[Fonts.typography("paperFontBody2"), textColor, {
                        textAlign: "center",
                        paddingHorizontal: 3
                    }]}>
                        {this.I18n.t(this.props.title)}
                    </Text>
                    <Text style={[Fonts.typography("paperFontBody2"), textColor]}>
                        {this.props.number}
                    </Text>
                </View>
            </TouchableNativeFeedback>
        );
    }
}

export default TitleNumberBlock;
