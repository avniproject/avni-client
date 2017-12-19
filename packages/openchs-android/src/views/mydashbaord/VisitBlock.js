import React, {Component} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Fonts from '../primitives/Fonts';
import _ from 'lodash';
import DGS from '../primitives/DynamicGlobalStyles';
import AbstractComponent from "../../framework/view/AbstractComponent";
import Colors from "../primitives/Colors";


class VisitBlock extends AbstractComponent {
    static propTypes = {
        title: React.PropTypes.string,
        number: React.PropTypes.number,
    };

    static styles = StyleSheet.create({
        container: {
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            flexWrap: 'wrap',
            width: DGS.resizeWidth(76),
            height: DGS.resizeHeight(72),
            shadowOffset: {width: 0, height: 2},
            shadowOpacity: 1.0,
            backgroundColor: 'white',
            shadowColor: "black",
            shadowRadius: 2,
        },
        title: {
            color: "#2c2c2c",
        },
        number: {
            color: "#2c2c2c",
        }
    });

    render() {
        const title = _.startCase(this.props.title);
        return (
            <View style={VisitBlock.styles.container}>
                <Text style={[Fonts.typography("paperFontCaption"), VisitBlock.styles.title]}>
                    {title}
                </Text>
                <Text style={[Fonts.typography("paperFontButton"), VisitBlock.styles.number]}>
                    {this.props.number}
                </Text>
            </View>
        );
    }
}

export default VisitBlock;