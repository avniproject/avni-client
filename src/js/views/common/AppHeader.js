import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import TypedTransition from "../../framework/routing/TypedTransition";
import {Button, Icon} from "native-base";
import {Text, View} from "react-native";
import _ from "lodash";
import Colors from "../primitives/Colors";
import DGS from "../primitives/DynamicGlobalStyles";
import CHSNavigator from "../../utility/CHSNavigator";

class AppHeader extends AbstractComponent {
    static propTypes = {
        title: React.PropTypes.string.isRequired,
        func: React.PropTypes.func
    };

    constructor(props, context) {
        super(props, context);
    }

    onBack() {
        if (_.isNil(this.props.func))
            TypedTransition.from(this).goBack();
        else
            this.props.func();
    }

    onHome() {
        CHSNavigator.goHome(this);
    }

    render() {
        return (
            <View style={{backgroundColor: Colors.BlackBackground, flexDirection: 'row', alignItems: 'center'}}>
                <Button transparent onPress={() => this.onBack()} style={{paddingHorizontal: 0, marginHorizontal: 10}}>
                    <Icon style={{fontSize: 25, color: 'white', marginTop: DGS.resizeHeight(5)}} name='keyboard-arrow-left'/>
                </Button>
                <View style={{flex: 1, flexDirection: 'row', justifyContent: 'center'}}>
                    <Text style={{color: 'white'}}>{this.props.title}</Text>
                </View>
                <Button transparent onPress={() => this.onHome()} style={{paddingHorizontal: 0, marginHorizontal: 10}}>
                    <Icon style={{fontSize: 25, color: 'white'}} name='home'/>
                </Button>
            </View>
        );
    }
}

export default AppHeader;