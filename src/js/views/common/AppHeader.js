import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import TypedTransition from "../../framework/routing/TypedTransition";
import {Button, Header, Icon, Title} from "native-base";
import _ from "lodash";
import Colors from "../primitives/Colors";
import DynamicGlobalStyles from "../primitives/DynamicGlobalStyles";

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
            <Header style={{backgroundColor: Colors.BlackBackground}}>
                <Button transparent onPress={() => this.onPress()}>
                    <Icon style={{fontSize: 25, marginBottom: DynamicGlobalStyles.resizeHeight(8)}} name='keyboard-arrow-left'/>
                </Button>
                <Title>{this.props.title}</Title>
            </Header>
        );
    }
}

export default AppHeader;