import {View, StyleSheet, Text} from 'react-native';
import React, {Component} from 'react';
import AbstractComponent from '../../framework/view/AbstractComponent';
import _ from "lodash";

class Separator extends AbstractComponent {
    static propTypes = {};

    constructor(props, context) {
        super(props, context);
    }

    render() {
        return (
            <Text style={{height: 1, backgroundColor: '#00000012'}}/>
        );
    }
}

export default Separator;