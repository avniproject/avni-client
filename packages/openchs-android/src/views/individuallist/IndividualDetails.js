import React, {Component} from 'react';
import {View, Text, StyleSheet, TouchableNativeFeedback} from 'react-native';
import Fonts from '../primitives/Fonts';
import AbstractComponent from "../../framework/view/AbstractComponent";
import DGS from "../primitives/DynamicGlobalStyles";


class IndividualDetails extends AbstractComponent {
    static propTypes = {
        address: React.PropTypes.object,
    };

    static styles = StyleSheet.create({
        container: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'nowrap',
            marginBottom: DGS.resizeHeight(17)
        },
        title: {
            color: "rgba(0, 0, 0, 0.87)",
        },
        viewall: {
            color: "rgba(0, 0, 0, 0.54)",
        }
    });

    render() {
        return (
            <TouchableNativeFeedback onPress={() => console.log("YAO")}
                                     background={TouchableNativeFeedback.SelectableBackground()}>
                <Text style={{margin: 50}}>
                    {this.props.individual.name}
                </Text>
            </TouchableNativeFeedback>
        );
    }
}

export default IndividualDetails;