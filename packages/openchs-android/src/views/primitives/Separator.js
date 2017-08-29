import {View, StyleSheet, Text} from 'react-native';
import React, {Component} from 'react';
import AbstractComponent from '../../framework/view/AbstractComponent';

class Separator extends AbstractComponent {
    static propTypes = {
        style: React.PropTypes.object
    };

    constructor(props, context) {
        super(props, context);
    }

    render() {
        return (
            <Text style={this.appendedStyle({height: 1, backgroundColor: '#00000012'})}/>
        );
    }
}

export default Separator;