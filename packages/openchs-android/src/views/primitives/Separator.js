import {View, StyleSheet, Text} from 'react-native';
import PropTypes from 'prop-types';
import React, {Component} from 'react';
import AbstractComponent from '../../framework/view/AbstractComponent';

class Separator extends AbstractComponent {
    static propTypes = {
        style: PropTypes.object,
        height: PropTypes.number,
        backgroundColor: PropTypes.string
    };

    static defaultProps = {
        height: 1,
        backgroundColor: "#00000012"
    };


    constructor(props, context) {
        super(props, context);
    }

    render() {
        return (
            <Text style={this.appendedStyle({
                height: this.props.height,
                backgroundColor: this.props.backgroundColor
            })}/>
        );
    }
}

export default Separator;
