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
import SettingsView from "../settings/SettingsView";
import {LandingViewActionsNames} from "../../action/LandingViewActions";

class AppHeader extends AbstractComponent {
    static propTypes = {
        title: PropTypes.string.isRequired,
        func: PropTypes.func,
        icon: PropTypes.string,
        iconFunc: PropTypes.func,
        hideBackButton: PropTypes.bool,
        hideIcon: PropTypes.bool,
        iconComponent: PropTypes.object,
        showSettings: PropTypes.bool,
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
    
    renderSettings() {
        return <TouchableNativeFeedback
            onPress={() => TypedTransition.from(this).to(SettingsView)}
            background={this.background()}>
            <View style={{
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'flex-start',
                height: 30,
                width: 30,
                paddingRight: 2,
                alignSelf: 'center',
                marginRight: 16,
            }}>
                <MCIIcon style={{fontSize: 30, color: Colors.headerIconColor}} name={'settings'}/>
            </View>
        </TouchableNativeFeedback>
    }

    onHome() {
        CHSNavigator.goHome(this);
        this.dispatchAction(LandingViewActionsNames.ON_HOME_CLICK)
    }

    background() {
        return Platform['Version'] >= 21 ?
            TouchableNativeFeedback.SelectableBackgroundBorderless() :
            TouchableNativeFeedback.SelectableBackground();
    }

    renderIcon() {
        if (!_.isNil(this.props.iconComponent)) {
            return this.props.iconComponent;
        } else {
            return _.isNil(this.props.icon) ? (this.props.hideIcon ? <View/> :
                <Icon style={{fontSize: 30, color: Colors.headerIconColor}} name='home'/>) :
                <MCIIcon style={{fontSize: 30, color: Colors.headerIconColor}} name={this.props.icon}/>
        }
    }

    render() {
        return (
            <View style={{
                backgroundColor: Colors.headerBackgroundColor,
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
                            <Icon style={{fontSize: 35, color: Colors.headerIconColor}} name='keyboard-arrow-left'/>
                        </View>
                    </TouchableNativeFeedback>}

                <View style={{flex: 1, flexDirection: 'row', alignSelf: 'center'}}>
                    <Text style={[{
                        color: Colors.headerTextColor,
                        fontSize: 15
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
                        paddingHorizontal: 16,
                    }}>
                        {this.renderIcon()}
                    </View>
                </TouchableNativeFeedback>
                {this.props.showSettings ? this.renderSettings() : <View/>}
            </View>
        );
    }
}

export default AppHeader;
