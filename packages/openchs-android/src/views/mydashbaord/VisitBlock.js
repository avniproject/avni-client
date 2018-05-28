import React, {Component} from 'react';
import {View, Text, StyleSheet, TouchableNativeFeedback} from 'react-native';
import Fonts from '../primitives/Fonts';
import _ from 'lodash';
import DGS from '../primitives/DynamicGlobalStyles';
import AbstractComponent from "../../framework/view/AbstractComponent";


class VisitBlock extends AbstractComponent {
    static propTypes = {
        title: React.PropTypes.string,
        number: React.PropTypes.number,
        highlight: React.PropTypes.bool
    };

    static styles = StyleSheet.create({
        container: {
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            flexWrap: 'wrap',
            width: DGS.resizeWidth(127),
            height: DGS.resizeHeight(120),
            shadowOffset: {width: 0, height: 2},
            shadowOpacity: 0.5,
            elevation: 2,
            backgroundColor: 'white',
            shadowColor: "black",
            shadowRadius: 2,
        },
        title: {
            color: "#2c2c2c",
        },
        highlight: {
            color: "#960000",
        }
    });

    render() {
        const textColor = this.props.highlight ? VisitBlock.styles.highlight : VisitBlock.styles.title;
        return (
            <TouchableNativeFeedback onPress={this.props.onPress}>
                <View style={VisitBlock.styles.container}>
                    <Text style={[Fonts.typography("paperFontTitle"), textColor, {fontWeight: "400", textAlign: "center"}]}>
                        {this.I18n.t(this.props.title)}
                    </Text>
                    <Text style={[Fonts.typography("paperFontTitle"), textColor]}>
                        {this.props.number}
                    </Text>
                </View>
            </TouchableNativeFeedback>
        );
    }
}

export default VisitBlock;