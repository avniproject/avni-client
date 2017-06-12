import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import TypedTransition from "../../framework/routing/TypedTransition";
import {Icon} from "native-base";
import {Text, TouchableNativeFeedback, View} from "react-native";
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
            <View style={{
                backgroundColor: Colors.DefaultPrimaryColor,
                flexDirection: 'row',
                minHeight: DGS.resizeHeight(56)
            }}>
                <TouchableNativeFeedback onPress={() => this.onBack()}
                                         background={TouchableNativeFeedback.SelectableBackgroundBorderless()}>
                    <View style={{
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'flex-start',
                        height: DGS.resizeHeight(56),
                        width: DGS.resizeWidth(72),
                        paddingLeft: DGS.resizeWidth(16),
                        paddingRight: DGS.resizeWidth(16)
                    }}>
                        <Icon style={{fontSize: 24, color: Colors.TextOnPrimaryColor}} name='keyboard-arrow-left'/>
                    </View>
                </TouchableNativeFeedback>

                <View style={{flex: 1, flexDirection: 'row', alignSelf: 'center'}}>
                    <Text style={{color: Colors.TextOnPrimaryColor, fontSize: 20}}>{this.props.title}</Text>
                </View>

                <TouchableNativeFeedback onPress={() => this.onHome()}
                                         background={TouchableNativeFeedback.SelectableBackground()}>
                    <View style={{
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'flex-end',
                        height: DGS.resizeHeight(56),
                        width: DGS.resizeWidth(72),
                        paddingLeft: DGS.resizeWidth(16),
                        paddingRight: DGS.resizeWidth(16)
                    }}>
                        <Icon style={{fontSize: 24, color: Colors.TextOnPrimaryColor}} name='home'/>
                    </View>
                </TouchableNativeFeedback>
            </View>
        );
    }
}

export default AppHeader;