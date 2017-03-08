import {View, StyleSheet} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import TypedTransition from "../../framework/routing/TypedTransition";
import {Button, Header, Title, Icon} from "native-base";
import _ from 'lodash';
import Colors from '../primitives/Colors';

class AppHeader extends AbstractComponent {
    static propTypes = {
        title: React.PropTypes.string.isRequired,
        func: React.PropTypes.func
    };

    constructor(props, context) {
        super(props, context);
    }

    onPress() {
        if (_.isNil(this.props.func))
            TypedTransition.from(this).goBack();
        else
            this.props.func();
    }

    render() {
        return (
            <Header style={{backgroundColor: Colors.Blackish}}>
                <Button transparent onPress={() => this.onPress()}>
                    <Icon style={{fontSize: 25}} name='keyboard-arrow-left'/>
                </Button>
                <Title>{this.props.title}</Title>
            </Header>
        );
    }
}

export default AppHeader;