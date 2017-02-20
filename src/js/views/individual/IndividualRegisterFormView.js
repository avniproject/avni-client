import {View, StyleSheet} from 'react-native';
import React, {Component} from 'react';
import AbstractComponent from '../../framework/view/AbstractComponent';
import Path from "../../framework/routing/Path";
import _ from "lodash";
import ReducerKeys from "../../reducer";

@Path('/IndividualRegisterFormView')
class IndividualRegisterFormView extends AbstractComponent {
    static propTypes = {};

    viewName() {
        return "IndividualRegisterFormView";
    }

    constructor(props, context) {
        super(props, context, ReducerKeys.individualRegister);
    }

    render() {
        return (
            <View />
        );
    }
}

export default IndividualRegisterFormView;