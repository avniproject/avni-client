import React, {Component} from 'react';
import {View} from 'react-native';
import AbstractComponent from "../../framework/view/AbstractComponent";
import Filter from './Filter';

class Filters extends AbstractComponent {
    render() {
        return (
            <View>
                <Filter/>
                <Filter/>
            </View>
        );
    }
}

export default Filters;