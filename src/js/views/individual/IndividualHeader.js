import {View, StyleSheet, Text} from 'react-native';
import React, {Component} from 'react';
import AbstractComponent from '../../framework/view/AbstractComponent';
import Individual from "../../models/Individual";

class IndividualHeader extends AbstractComponent {
    static propTypes = {
        individual: React.PropTypes.object.isRequired
    };

    constructor(props, context) {
        super(props, context);
    }

    render() {
        return (<View style={{flexDirection: "column"}}>
            <View style={{flexDirection: "row", justifyContent: "space-between"}}>
                <Text>{this.props.individual.name}</Text>
                <Text>{this.props.individual.lowestAddressLevel.title}</Text>
            </View>
            <View style={{flexDirection: "row", justifyContent: "space-between"}}>
                <Text>{`${this.props.individual.gender} | ${this.props.individual.getAge().toString()}`}</Text>
                <Text>Programs-Enrolled</Text>
            </View>
        </View>);
    }
}

export default IndividualHeader;