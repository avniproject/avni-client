import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import TypedTransition from "../../framework/routing/TypedTransition";
import {Icon} from "native-base";
import MCIIcon from "react-native-vector-icons/MaterialCommunityIcons";
import {Text, TouchableNativeFeedback, View, Platform} from "react-native";
import _ from "lodash";
import Colors from "../primitives/Colors";
import CHSNavigator from "../../utility/CHSNavigator";

class AppHeader extends AbstractComponent {
    static propTypes = {
        title: PropTypes.string.isRequired,
        func: PropTypes.func,
        icon: PropTypes.string,
        iconFunc: PropTypes.func,
        hideBackButton: PropTypes.bool,
        hideIcon: PropTypes.bool,
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

    background() {
        return Platform['Version'] >= 21 ?
            TouchableNativeFeedback.SelectableBackgroundBorderless() :
            TouchableNativeFeedback.SelectableBackground();
    }

    render() {
        return (
            <View style={{
                backgroundColor: Colors.DefaultPrimaryColor,
                flexDirection: 'row',
                height: 56,
                elevation: 3,
            }}>
                {this.props.hideBackButton ? <View/> :
                    <TouchableNativeFeedback onPress={() => this.onBack()}
                                             background={this.background()}>
                        <View style={{
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'flex-start',
                            height: 56,
                            width: 72,
                            paddingHorizontal: 16
                        }}>
                            <Icon style={{fontSize: 40, color: Colors.TextOnPrimaryColor}} name='keyboard-arrow-left'/>
                        </View>
                    </TouchableNativeFeedback>}

                <View style={{flex: 1, flexDirection: 'row', alignSelf: 'center'}}>
                    <Text style={[{
                        color: Colors.TextOnPrimaryColor,
                        fontSize: 20
                    }, this.props.hideBackButton && {marginLeft: 20}]}>{this.props.title}</Text>
                </View>

                <TouchableNativeFeedback
                    onPress={() => (_.isNil(this.props.iconFunc) ? this.onHome() : this.props.iconFunc())}
                    background={this.background()}>
                    <View style={{
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'flex-end',
                        height: 56,
                        width: 72,
                        paddingHorizontal: 16
                    }}>
                        {_.isNil(this.props.icon) ? (this.props.hideIcon ? <View/> :
                            <Icon style={{fontSize: 40, color: Colors.TextOnPrimaryColor}} name='home'/>) :
                            <MCIIcon style={{fontSize: 40, color: Colors.TextOnPrimaryColor}}
                                     name={this.props.icon}/>}
                    </View>
                </TouchableNativeFeedback>
            </View>
        );
    }
}

export default AppHeader;
