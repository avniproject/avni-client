import DeviceInfo from 'react-native-device-info';
import React from 'react';
import AbstractComponent from '../framework/view/AbstractComponent';
import Path from '../framework/routing/Path';
import {
    Alert,
    Text,
    TouchableNativeFeedback,
    View,
    BackHandler, Image, Dimensions
} from 'react-native';
import TextFormElement from './form/formElement/TextFormElement';
import StaticFormElement from './viewmodel/StaticFormElement';
import {LoginActionsNames as Actions} from '../action/LoginActions';
import {PrimitiveValue, ErrorCodes} from 'avni-models';
import Reducers from '../reducer';
import CHSNavigator from '../utility/CHSNavigator';
import CHSContainer from './common/CHSContainer';
import CHSContent from './common/CHSContent';
import Styles from './primitives/Styles';
import Colors from './primitives/Colors';
import _ from 'lodash';
import {Checkbox as CheckBox, ScrollView, Spinner} from "native-base";
import General from '../utility/General';
import AuthService from '../service/AuthService';
import {ConfirmDialog} from 'react-native-simple-dialogs';
import Fonts from './primitives/Fonts';
import Config from '../framework/Config';
import DBRestoreProgress from './DBRestoreProgress';
import SyncService from '../service/SyncService';
import TypedTransition from '../framework/routing/TypedTransition';
import SetPasswordView from './SetPasswordView';
import LandingView from './LandingView';

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

    loginComplete(source) {
        const backFunction = _.get(source.props, 'params.backFunction');
        if (backFunction) {
            backFunction(source);
        } else {
            CHSNavigator.navigateToLandingView(source, true, {tabIndex: 1, menuProps: {startSync: true}});
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

    newPasswordRequired(user, onSuccessCB) {
        this.dispatchAction(Actions.ON_STATE_CHANGE, {
            newState: {
                loginError: '',
                loggingIn: false
            }
        });
        CHSNavigator.navigateToSetPasswordView(this, user, onSuccessCB);
    }

    forgotPassword() {
        CHSNavigator.navigateToForgotPasswordView(this);
    }

    cancelLogin() {
        CHSNavigator.navigateToLandingView(this);
    };

    viewName() {
        return 'LoginView';
    }

    errorMessage() {
        const error = this.state.loginError || '';
        return error.slice(error.indexOf(':') + 1).trim();
    }

    spinner() {
        return this.state.loggingIn ? (
            <View style={{
                position: 'absolute',
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
        ) : <View/>;
    }

    renderMultiUserLoginFailure() {
        return (<ConfirmDialog
            title={this.I18n.t('cannotChangeUserTitle', {newUser: this.state.userId})}
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
                    {this.I18n.t('cannotChangeUserDesc', {
                        oldUser: this.state.loggedInUser,
                        newUser: this.state.userId
                    })}
                </Text>
            </View>
        </ConfirmDialog>);
    }

    restoreFailureAlert(errorMessage, source) {
        const isCatchmentError = ErrorCodes[errorMessage] === ErrorCodes.NoCatchmentFound;
        isCatchmentError ? this.noCatchmentAlert(this.I18n.t(ErrorCodes[errorMessage])) :
            Alert.alert(this.I18n.t('restoreFailedTitle'), errorMessage, [{
                    text: this.I18n.t('tryAgain'),
                    onPress: () => this.dispatchAction(Actions.ON_DUMP_RESTORE_RETRY, {
                        ...this.dumpRestoreAction.call(this),
                        source
                    })
                },
                    {text: this.I18n.t('performNormalSync'), onPress: () => this.loginComplete(source), style: 'cancel'}
                ]
            );
    }

    noCatchmentAlert(errorMessage) {
        Alert.alert(this.I18n.t('restoreFailedTitle'), errorMessage, [{
                text: this.I18n.t('ok'),
                onPress: () => BackHandler.exitApp()
            }
            ]
        );
    }

    render() {
        General.logDebug('LoginView', 'render');
        const {width, height} = Dimensions.get('window');
        return (
            <CHSContainer>
                <ScrollView keyboardShouldPersistTaps="handled">
                    <DBRestoreProgress/>
                    <CHSContent>
                        <View style={{
                            minHeight: height,
                        }}>
                            <View style={{
                                flexDirection: 'column',
                                justifyContent: 'center',
                                minHeight: height*0.8,
                                paddingHorizontal: 48
                            }}>
                                <Image source={{uri: `asset:/avni-logo.png`}}
                                       style={{height: 120, width: 120, alignSelf: 'center', }} resizeMode={'center'}/>
                                {this.renderMultiUserLoginFailure()}
                                <Text style={{
                                    color: Colors.ValidationError,
                                    justifyContent: 'center'
                                }}>{this.errorMessage()}</Text>
                                <View>
                                    <TextFormElement element={new StaticFormElement('userId')}
                                                     actionName={Actions.ON_USER_ID_CHANGE}
                                                     validationResult={this.state.validationResult}
                                                     value={new PrimitiveValue(this.state.userId)}
                                                     multiline={false}
                                                     autoCapitalize={'none'}
                                                     autoCompleteType={'username'}
                                                     keyboardType={'email-address'}
                                    />
                                    {this.state.idpType !== 'none' ?
                                        <View>
                                            <TextFormElement element={new StaticFormElement('password')}
                                                             secureTextEntry={!this.state.showPassword}
                                                             actionName={Actions.ON_PASSWORD_CHANGE} validationResult={null}
                                                             value={new PrimitiveValue(this.state.password)}
                                                             multiline={false}
                                            />
                                            <View style={{
                                                flexDirection: 'column',
                                                justifyContent: 'space-between',
                                                alignItems: 'flex-start',
                                            }}>
                                                <TouchableNativeFeedback
                                                    onPress={() => this.dispatchAction(Actions.ON_TOGGLE_SHOW_PASSWORD)}>
                                                    <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 5}}>
                                                        <CheckBox
                                                          accessible={true}
                                                          accessibilityLabel={"Show password"}
                                                          onChange={() => this.dispatchAction(Actions.ON_TOGGLE_SHOW_PASSWORD)}
                                                          isChecked={this.state.showPassword}/>
                                                        <Text
                                                            style={[Styles.formLabel, {paddingLeft: 12}]}>{this.I18n.t('Show password')}</Text>
                                                    </View>
                                                </TouchableNativeFeedback>
                                                <TouchableNativeFeedback onPress={() => {
                                                    this.forgotPassword();
                                                }} background={TouchableNativeFeedback.SelectableBackground()}>
                                                    <View style={{paddingTop: 7}}>
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
                                            this.cancelLogin();
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
                                        <View style={[Styles.basicPrimaryButtonView,
                                            {minWidth: 144, width: '100%', flex: 1, flexDirection: "row", justifyContent: "center"}]}>
                                            <Text style={{
                                                color: Styles.whiteColor,
                                                fontSize: 16
                                            }}>{this.I18n.t('LOGIN')}</Text>
                                        </View>
                                    </TouchableNativeFeedback>
                                </View>
                            </View>
                            <View style={{
                                flexDirection: 'column',
                                justifyContent: 'flex-end',
                                alignItems: 'center',
                                minHeight: height*0.15,
                                paddingLeft: 16
                            }}>
                                <Text>Powered by Avni (Version {DeviceInfo.getVersion()}-{Config.COMMIT_ID})</Text>
                                {Config.ENV !== 'prod' &&
                                    <Text style={{
                                        fontSize: Styles.normalTextSize,
                                        fontStyle: 'normal',
                                        color: Styles.blackColor,
                                        marginVertical: 0,
                                    }}>{Config.ENV}</Text>
                                }
                            </View>
                        </View>
                    </CHSContent>
                </ScrollView>
            </CHSContainer>
        );
    }

    clearDataAndLogin() {
        this.getService(AuthService).getAuthProviderService().logout()
            .then(() => this.getService(SyncService).clearData())
            .then(() => this.getService(AuthService).fetchAuthSettingsFromServer())
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
            ...this.dumpRestoreAction(),
            source: this
        });
    }

    onLoginProgress(percentProgress, message) {
        General.logDebug('LoginView', message);
        this.dispatchAction(Actions.ON_DUMP_RESTORING, {percentProgress: percentProgress, message: message});
    }

    successCBFromSetPasswordView(source) {
        TypedTransition.from(source).resetStack([LoginView, SetPasswordView], [
            TypedTransition.createRoute(LandingView, {tabIndex: 1, menuProps: {startSync: true}}, true)
        ]);
    }

    dumpRestoreAction() {
        return {
            onLoginProgress: (percentProgress, message) => this.onLoginProgress(percentProgress, message),
            checkForRetry: (errorMessage, source) => this.restoreFailureAlert(errorMessage, source),
            successCb: (source) => this.loginComplete(source),
            successCBFromSetPasswordView: (source) => this.successCBFromSetPasswordView(source),
        };
    }
}

export default LoginView;
