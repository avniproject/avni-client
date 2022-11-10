import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import TypedTransition from "../../framework/routing/TypedTransition";
import {Icon} from "native-base";
import MCIIcon from "react-native-vector-icons/MaterialCommunityIcons";
import {Platform, Text, TouchableNativeFeedback, View} from "react-native";
import _ from "lodash";
import Colors from "../primitives/Colors";
import CHSNavigator from "../../utility/CHSNavigator";
import {LandingViewActionsNames} from "../../action/LandingViewActions";
import SyncComponent from "../SyncComponent";
import ExitBeneficiaryModeButton from "../beneficiaryMode/ExitBeneficiaryModeButton";
import {MyDashboardActionNames} from "../../action/mydashboard/MyDashboardActions";
import UserInfoService from "../../service/UserInfoService";
import {AvniAlert} from "./AvniAlert";
import CommentResolveButton from "../comment/CommentResolveButton";

class AppHeader extends AbstractComponent {
    static propTypes = {
        title: PropTypes.string.isRequired,
        func: PropTypes.func,
        hideBackButton: PropTypes.bool,
        hideIcon: PropTypes.bool,
        icons: PropTypes.array,
        displayHomePressWarning: PropTypes.bool,
    };

    static defaultProps = {
        icons: []
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
        if (this.props.displayHomePressWarning) {
            AvniAlert(this.I18n.t('homePressTitle'), this.I18n.t('homePressMessage'), this.goToHome.bind(this), this.I18n);
        } else {
            this.goToHome();
        }
    }

    goToHome() {
        CHSNavigator.goHome(this);
        this.dispatchAction(LandingViewActionsNames.ON_HOME_CLICK);
        this.dispatchAction(MyDashboardActionNames.ON_LOAD, {fetchFromDB: !this.getService(UserInfoService).getUserSettings().disableAutoRefresh});
    }

    background() {
        return TouchableNativeFeedback.SelectableBackgroundBorderless();
    }

    renderHomeIcon() {
        return <TouchableNativeFeedback
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
                {_.isNil(this.props.icon) ? (this.props.hideIcon ? <View/> :
                    <MCIIcon style={{fontSize: 30, color: Colors.headerIconColor}} name='home'/>) :
                    <MCIIcon style={{fontSize: 30, color: Colors.headerIconColor}} name={this.props.icon}/>}
            </View>
        </TouchableNativeFeedback>;
    }

    renderSyncIcon() {
        return <SyncComponent startSync={this.props.startSync} icon={this.props.icon}/>
    }

    renderExitBeneficiaryMode() {
        return <ExitBeneficiaryModeButton/>;
    }

    renderCommentResolve() {
        return <CommentResolveButton onResolveComment={this.props.iconFunc}/>;
    }

    render() {
        return (
            <View style={{
                backgroundColor: Colors.headerBackgroundColor,
                flexDirection: 'row',
                minHeight: 56,
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
                            <MCIIcon style={{fontSize: 35, color: Colors.headerIconColor}} name='arrow-left'/>
                        </View>
                    </TouchableNativeFeedback>}

                <View style={{flex: 1, flexDirection: 'row', alignSelf: 'center'}}>
                    <Text style={[{
                        color: Colors.headerTextColor,
                        fontSize: 18
                    }, this.props.hideBackButton && {marginLeft: 20}]}>{this.props.title}</Text>
                </View>
                {this.props.renderSync && this.renderSyncIcon()}
                {this.props.renderExitBeneficiaryMode && this.renderExitBeneficiaryMode()}
                {this.props.renderCommentResolve && this.renderCommentResolve()}
                {!this.props.renderSync && !this.props.renderExitBeneficiaryMode && !this.props.renderCommentResolve && this.renderHomeIcon()}
            </View>
        );
    }
}

export default AppHeader;
