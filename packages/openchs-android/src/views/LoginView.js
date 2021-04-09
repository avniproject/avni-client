import DeviceInfo from "react-native-device-info";
import React from "react";
import AbstractComponent from "../framework/view/AbstractComponent";
import Path from "../framework/routing/Path";
import {
    Alert,
    Dimensions,
    Modal,
    StatusBar,
    Text,
    TouchableNativeFeedback,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import TextFormElement from "./form/formElement/TextFormElement";
import StaticFormElement from "./viewmodel/StaticFormElement";
import {LoginActionsNames as Actions} from '../action/LoginActions';
import Distances from './primitives/Distances';
import {PrimitiveValue} from 'avni-models';
import Reducers from "../reducer";
import CHSNavigator from "../utility/CHSNavigator";
import CHSContainer from "./common/CHSContainer";
import CHSContent from "./common/CHSContent";
import Styles from "./primitives/Styles";
import Colors from "./primitives/Colors";
import _ from "lodash";
import {Button, CheckBox, Spinner} from "native-base";
import General from "../utility/General";
import AuthService from "../service/AuthService";
import {ConfirmDialog} from 'react-native-simple-dialogs';
import Fonts from "./primitives/Fonts";
import Config from '../framework/Config';
import ProgressBarView from "./ProgressBarView";

@Path('/loginView')
class LoginView extends AbstractComponent {
    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.loginActions);
        this.safeLogin = this.safeLogin.bind(this);
        this.clearDataAndLogin = this.clearDataAndLogin.bind(this);
    }

    componentDidMount() {
        this.dispatchAction(Actions.ON_LOAD);
    }

    reset() {
        const userIdBeforeReset = this.state.userId;
        const passwdBeforeReset = this.state.password;
        this.dispatchAction('RESET');
        this.dispatchAction(Actions.ON_LOAD);
        this.dispatchAction(Actions.ON_USER_ID_CHANGE, {value: userIdBeforeReset});
        this.dispatchAction(Actions.ON_PASSWORD_CHANGE, {value: passwdBeforeReset});
    }

    loginComplete() {
        const backFunction = _.get(this.props, 'params.backFunction');
        if (backFunction) {
            backFunction(this);
        } else {
            CHSNavigator.navigateToLandingView(this, true, {tabIndex: 1, menuProps: {startSync: true}});
        }
    }

    loginFailure(loginError) {
        this.dispatchAction(Actions.ON_STATE_CHANGE, {
            newState: {
                loginError: loginError,
                loggingIn: false
            }
        });
    }

    newPasswordRequired(user) {
        this.dispatchAction(Actions.ON_STATE_CHANGE, {
            newState: {
                loginError: "",
                loggingIn: false
            }
        });
        CHSNavigator.navigateToSetPasswordView(this, user);
    }

    forgotPassword() {
        CHSNavigator.navigateToForgotPasswordView(this);
    }

    cancelLogin() {
        CHSNavigator.navigateToLandingView(this);
    };

    viewName() {
        return "LoginView";
    }

    errorMessage() {
        const error = this.state.loginError || '';
        return error.slice(error.indexOf(":") + 1).trim();
    }

    spinner() {
        return this.state.loggingIn ? (
            <View style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
                backgroundColor: Colors.defaultBackground
            }}>
                <Spinner/>
            </View>
        ) : <View/>
    }

    renderMultiUserLoginFailure() {
        return (<ConfirmDialog
            title={this.I18n.t("cannotChangeUserTitle", {newUser: this.state.userId})}
            visible={this.state.showMultiUserLoginWarning}
            onTouchOutside={() => this.setState({showMultiUserLoginWarning: false})}
            negativeButton={{
                style: {backgroundColor: Colors.NegativeActionButtonColor},
                titleStyle: {color: Colors.TextOnPrimaryColor},
                title: 'Delete data and login',
                onPress: () => this.setState({showMultiUserLoginWarning: false}, this.clearDataAndLogin)
            }}
            positiveButton={{
                style: {backgroundColor: Colors.ActionButtonColor},
                titleStyle: {color: Colors.TextOnPrimaryColor},
                title: 'Cancel',
                onPress: () => this.setState({showMultiUserLoginWarning: false})
            }}
        >
            <View>
                <Text style={{
                    fontSize: Fonts.Large,
                    color: Colors.InputNormal,
                }}>
                    {this.I18n.t("cannotChangeUserDesc", {
                        oldUser: this.state.loggedInUser,
                        newUser: this.state.userId
                    })}
                </Text>
            </View>
        </ConfirmDialog>);
    }

    render() {
        General.logDebug(this.viewName(), 'render');
        return (
            <CHSContainer>
                <ProgressBarView progress={this.state.percentDone / 100} message={this.state.dumpRestoreMessage} syncing={this.state.dumpRestoring} onPress={_.noop} notifyUserOnCompletion={false}/>
                <CHSContent>
                    {this.renderMultiUserLoginFailure()}
                    <StatusBar backgroundColor={Styles.blackColor} barStyle="light-content"/>
                    <View style={{
                        padding: 72,
                        paddingTop: 144,
                        flexDirection: 'column',
                        justifyContent: 'flex-start'
                    }}>
                        <Text style={Styles.logoPlaceHolder}>{DeviceInfo.getApplicationName()}</Text>

                        <Text style={{
                            color: Colors.ValidationError,
                            justifyContent: 'center'
                        }}>{this.errorMessage()}</Text>
                        <View>
                            <TextFormElement element={new StaticFormElement('userId')}
                                             actionName={Actions.ON_USER_ID_CHANGE}
                                             validationResult={this.state.validationResult}
                                             value={new PrimitiveValue(this.state.userId)}
                                             style={{marginTop: Distances.VerticalSpacingBetweenFormElements}}
                                             multiline={false}
                                             autoCapitalize={"none"}
                                             autoCompleteType={"username"}
                                             keyboardType={'email-address'}
                            />
                            {Config.ENV !== 'dev' ?
                                <View>
                                    <TextFormElement element={new StaticFormElement('password')}
                                                     secureTextEntry={!this.state.showPassword}
                                                     actionName={Actions.ON_PASSWORD_CHANGE} validationResult={null}
                                                     style={{marginTop: Distances.VerticalSpacingBetweenFormElements}}
                                                     value={new PrimitiveValue(this.state.password)}
                                                     multiline={false}
                                    />
                                    <View style={{
                                        flexDirection: 'column',
                                        justifyContent: 'space-between',
                                        paddingBottom: 16,
                                        alignItems: 'flex-start',
                                        paddingTop: 8
                                    }}>
                                        <TouchableNativeFeedback
                                            onPress={() => this.dispatchAction(Actions.ON_TOGGLE_SHOW_PASSWORD)}>
                                            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                                <CheckBox
                                                    onPress={() => this.dispatchAction(Actions.ON_TOGGLE_SHOW_PASSWORD)}
                                                    checked={this.state.showPassword}/>
                                                <Text
                                                    style={[Styles.formLabel, {paddingLeft: 12}]}>{this.I18n.t('Show password')}</Text>
                                            </View>
                                        </TouchableNativeFeedback>
                                        <TouchableNativeFeedback onPress={() => {
                                            this.forgotPassword()
                                        }} background={TouchableNativeFeedback.SelectableBackground()}>
                                            <View style={{paddingLeft: 10, paddingTop: 10}}>
                                                <Text style={{
                                                    color: Styles.accentColor,
                                                    fontSize: 16
                                                }}>{this.I18n.t('Forgot Password')}</Text>
                                            </View>
                                        </TouchableNativeFeedback>
                                    </View>
                                    {this.spinner()}
                                </View>
                                : null}
                        </View>
                        <View style={{flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16}}>
                            {_.get(this, 'props.params.allowSkipLogin') ?
                                <TouchableNativeFeedback onPress={() => {
                                    this.cancelLogin()
                                }} background={TouchableNativeFeedback.SelectableBackground()}>
                                    <View style={[Styles.basicSecondaryButtonView, {minWidth: 144}]}>
                                        <Text style={{color: Styles.blackColor, fontSize: 16}}>SKIP</Text>
                                    </View>
                                </TouchableNativeFeedback>
                                :
                                <View/>
                            }
                            <TouchableNativeFeedback onPress={this.safeLogin}
                                                     background={TouchableNativeFeedback.SelectableBackground()}>
                                <View style={[Styles.basicPrimaryButtonView, {marginLeft: 16, minWidth: 144}]}>
                                    <Text style={{color: Styles.whiteColor, fontSize: 16}}>{this.I18n.t('LOGIN')}</Text>
                                </View>
                            </TouchableNativeFeedback>
                        </View>
                    </View>
                    <View style={{
                        alignSelf: 'center',
                        marginTop: 28
                    }}>
                        <Text style={{
                            fontSize: Styles.normalTextSize,
                            fontStyle: 'normal',
                            color: Styles.blackColor,
                            alignSelf: 'center',
                        }}>{Config.ENV !== 'prod' ? Config.ENV : ''}</Text>
                        <Text style={Styles.textList}>Version: {DeviceInfo.getVersion()}-{Config.COMMIT_ID}</Text>
                    </View>
                </CHSContent>
            </CHSContainer>
        );
    }

    clearDataAndLogin() {
        this.getService(AuthService).clearData()
            .then(() => this.reset())
            .then(() => this.justLogin());
    }

    safeLogin() {
        if (!this.state.validationResult.success) {
            return;
        }
        if (_.isEmpty(this.state.userId) || (Config.ENV !== 'dev' && _.isEmpty(this.state.password))) {
            this.dispatchAction(Actions.ON_EMPTY_LOGIN);
            return;
        }
        if (this.state.loggedInUser && this.state.loggedInUser !== this.state.userId) {
            this.setState({showMultiUserLoginWarning: true});
            return;
        }
        this.justLogin();
    }

    justLogin() {
        this.dispatchAction(Actions.ON_LOGIN, {
            failure: this.loginFailure.bind(this),
            newPasswordRequired: this.newPasswordRequired.bind(this),
            cb: (percentProgress, message) => {
                General.logDebug("LoginView", message);
                this.dispatchAction(Actions.ON_DUMP_RESTORING, {percentProgress: percentProgress, message: message});
            },
            successCb: this.loginComplete.bind(this)
        });
    }
}

export default LoginView;
