import {View, StyleSheet, Text} from 'react-native';
import PropTypes from 'prop-types';
import React, {Component} from 'react';
import AbstractComponent from '../../framework/view/AbstractComponent';

class IndividualHeader extends AbstractComponent {
    static propTypes = {
        individual: PropTypes.object.isRequired
    };

    constructor(props, context) {
        super(props, context);
    }

    render() {
        return (<View style={{flexDirection: "column"}}>
            <View style={{flexDirection: "row", justifyContent: "space-between"}}>
                <Text>{this.props.individual.nameString}</Text>
                <Text>{this.props.individual.lowestAddressLevel.name}</Text>
            </View>
            <View style={{flexDirection: "row", justifyContent: "space-between"}}>
                <Text>{`${this.props.individual.gender} | ${this.props.individual.getAge().toString()}`}</Text>
                <Text>Programs-Enrolled</Text>
            </View>
        </View>);
    }
}

export default IndividualHeader;