import DeviceInfo from 'react-native-device-info';
import React from 'react';
import AbstractComponent from '../framework/view/AbstractComponent';
import Path from '../framework/routing/Path';
import {
    Alert,
    Text,
    TouchableNativeFeedback,
    View,
    BackHandler, Image, Dimensions, ToastAndroid, StyleSheet
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Clipboard from "@react-native-clipboard/clipboard";
import TextFormElement from './form/formElement/TextFormElement';
import StaticFormElement from './viewmodel/StaticFormElement';
import {LoginActionsNames as Actions} from '../action/LoginActions';
import {PrimitiveValue, ErrorCodes} from 'openchs-models';
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
import Config from '../framework/Config';
import CustomConfirmDialog from './common/CustomConfirmDialog';
import DBRestoreProgress from './DBRestoreProgress';
import SyncService from '../service/SyncService';
import TypedTransition from '../framework/routing/TypedTransition';
import SetPasswordView from './SetPasswordView';
import LandingView from './LandingView';
import {IDP_PROVIDERS} from "../model/IdpProviders";
import EnvironmentConfig from "../framework/EnvironmentConfig";
import {EntityMappingConfig} from "openchs-models";
import EntityService from "../service/EntityService";
import ServerError, {getAvniError} from "../service/ServerError";
import ErrorUtil from "../framework/errorHandling/ErrorUtil";
import { AlertMessage } from "./common/AlertMessage";
import IssueUploadUtil from "../utility/IssueUploadUtil";
import RNRestart from 'react-native-restart';
import ProgressBarView from "./ProgressBarView";
import LocalCacheService from "../service/LocalCacheService";
import {SecureTextInput} from "./common/SecureTextInput";

@Path('/loginView')
class LoginView extends AbstractComponent {
    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.loginActions);
        this.safeLogin = this.safeLogin.bind(this);
        this.clearDataAndLogin = this.clearDataAndLogin.bind(this);
        this.state = {
            ...this.state,
            uploadProgress: 0,
            uploadMessage: ""
        };
    }

    onViewDidMount() {
        this.dispatchAction(Actions.ON_LOAD);
    }

    reset() {
        const userIdBeforeReset = this.state.userId;
        const passwdBeforeReset = this.state.password;
        const idpTypeBeforeReset = this.state.idpType;
        this.dispatchAction('RESET');
        this.dispatchAction(Actions.ON_LOAD);
        this.dispatchAction(Actions.ON_USER_ID_CHANGE, {value: userIdBeforeReset});
        this.dispatchAction(Actions.ON_PASSWORD_CHANGE, {value: passwdBeforeReset});
        this.dispatchAction(Actions.ON_USER_TOGGLE_IDP, {value: idpTypeBeforeReset});
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
        return this.I18n.t(error.slice(error.indexOf(':') + 1).trim());
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

    showMultiUserLoginFailure() {
        CustomConfirmDialog.show({
            title: this.I18n.t('cannotChangeUserTitle', {newUser: this.state.userId}),
            message: this.I18n.t('cannotChangeUserDesc', {
                oldUser: this.state.loggedInUser,
                newUser: this.state.userId
            }),
            yesLabel: this.I18n.t('clearDataAndLogin'),
            noLabel: this.I18n.t('cancel'),
            onYes: this.clearDataAndLogin
        });
    }

    displayFailureAlert(avniError, source) {
        // Show 2 buttons for all restore failures:
        // 1. Upload & Restart - uploads logs and restarts
        // 2. Perform Slow Sync - proceeds with slow sync using original realm
        // (Original realm is restored on failure, so slow sync will work)
        const uploadIssueInfoButton = IssueUploadUtil.createUploadIssueInfoButton(
            this.context,
            this.I18n,
            avniError,
            "LoginView",
            () => this.setState({uploading: true}),
            () => {
                this.setState({uploading: false});
                const RESTART_DELAY_MS = 2000;
                setTimeout(() => RNRestart.Restart(), RESTART_DELAY_MS);
            },
            (percentDone, message) => this.setState({uploadProgress: percentDone, uploadMessage: message}),
            this.state.userId
        );

        CustomConfirmDialog.show({
            title: this.I18n.t('restoreFailedTitle'),
            message: avniError.getDisplayMessage(),
            yesLabel: uploadIssueInfoButton.text,
            noLabel: this.I18n.t('performNormalSync'),
            onYes: uploadIssueInfoButton.onPress,
            onNo: () => this.loginComplete(source)
        });
    }

    restoreFailureAlert(error, source) {
        // Hide the progress dialog before showing the failure alert
        this.dispatchAction(Actions.ON_DUMP_RESTORING, {percentProgress: 100, message: null});
        
        if (error && error instanceof ServerError)
            getAvniError(error, this.I18n).then((avniError) => this.displayFailureAlert(avniError, source));
        else {
            this.displayFailureAlert(ErrorUtil.getAvniErrorSync(error), source);
            ErrorUtil.notifyBugsnag(error, "LoginView");
        }
    }

    // Whether the "Forget Password" link is applicable at all - unrelated to visual layout,
    // this mirrors the original condition so the link keeps showing up only for the IDPs that
    // actually support a self-service reset.
    get canResetPassword() {
        return this.state.idpType === IDP_PROVIDERS.COGNITO ||
            (this.state.idpType === IDP_PROVIDERS.BOTH && this.state.userSelectedIdp === IDP_PROVIDERS.COGNITO);
    }

    render() {
        General.logDebug('LoginView', 'render');
        const {height} = Dimensions.get('window');
        const errorMessage = this.errorMessage();
        return (
            <CHSContainer style={{backgroundColor: Colors.GreyContentBackground}}>
                {this.state.uploading && (
                    <ProgressBarView
                        progress={this.state.uploadProgress / 100}
                        message={this.state.uploadMessage}
                        syncing={this.state.uploading}
                        onPress={_.noop}
                        notifyUserOnCompletion={false}
                    />
                )}
                <ScrollView keyboardShouldPersistTaps="handled" style={{backgroundColor: Colors.GreyContentBackground}}>
                    <DBRestoreProgress/>
                    <CHSContent>
                        <View style={{
                            minHeight: height,
                            backgroundColor: Colors.GreyContentBackground
                        }}>
                            <View style={{
                                flexDirection: 'column',
                                justifyContent: 'center',
                                minHeight: height * 0.8,
                                paddingHorizontal: 16
                            }}>
                                {/* width matches the logo asset's true 2.5:1 aspect ratio so 'contain' doesn't
                                    letterbox empty space on the sides - that gap was throwing off left alignment
                                    with the card below. */}
                                <Image source={{uri: `asset:/logo.png`}}
                                       style={{height: 72, width: 180, alignSelf: 'flex-start', marginBottom: 24}} resizeMode={'contain'}/>
                                <View style={styles.card}>
                                    <Text style={styles.cardTitle}>{this.I18n.t('Login')}</Text>
                                    {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
                                    <TextFormElement element={new StaticFormElement('userId')}
                                                     actionName={Actions.ON_USER_ID_CHANGE}
                                                     validationResult={this.state.validationResult}
                                                     value={new PrimitiveValue(this.state.userId)}
                                                     multiline={false}
                                                     autoCapitalize={'none'}
                                                     autoCompleteType={'username'}
                                                     keyboardType={'email-address'}
                                                     containerStyle={styles.fieldContainer}
                                                     labelStyle={styles.fieldLabel}
                                                     inputStyle={styles.fieldInput}
                                                     labelColor={Colors.TextSecondary}
                                                     underlineColorAndroid={'transparent'}
                                    />
                                    {this.state.idpType !== IDP_PROVIDERS.NONE &&
                                        <View>
                                            <View style={styles.fieldContainer}>
                                                <View style={styles.fieldLabel}>
                                                    <Text style={[Styles.formLabel, {color: Colors.TextSecondary}]}>{this.I18n.t('password')}</Text>
                                                </View>
                                                {/* Built directly (instead of TextFormElement) so the eye icon can sit
                                                    inline in the same flex row as the input and center via alignItems,
                                                    rather than guessing an absolute offset against the label's height. */}
                                                <View style={styles.passwordInputRow}>
                                                    <SecureTextInput
                                                        style={styles.passwordTextInput}
                                                        underlineColorAndroid={'transparent'}
                                                        secureTextEntry={!this.state.showPassword}
                                                        value={this.state.password}
                                                        onChangeText={(text) => this.dispatchAction(Actions.ON_PASSWORD_CHANGE, {value: text})}
                                                    />
                                                    <TouchableNativeFeedback
                                                        accessible={true}
                                                        accessibilityLabel={this.I18n.t('Show password')}
                                                        onPress={() => this.dispatchAction(Actions.ON_TOGGLE_SHOW_PASSWORD)}
                                                        background={TouchableNativeFeedback.SelectableBackgroundBorderless()}>
                                                        <View style={styles.eyeIconButton}>
                                                            <Icon name={this.state.showPassword ? 'eye-off-outline' : 'eye-outline'}
                                                                  size={20} color={Colors.TextHint}/>
                                                        </View>
                                                    </TouchableNativeFeedback>
                                                </View>
                                            </View>
                                            {this.spinner()}
                                        </View>
                                    }
                                    {this.state.idpType === IDP_PROVIDERS.BOTH &&
                                        <TouchableNativeFeedback
                                            onPress={() => this.dispatchAction(Actions.ON_USER_TOGGLE_IDP)}>
                                            <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 12}}>
                                                <CheckBox
                                                    accessible={true}
                                                    accessibilityLabel={"Use Keycloak"}
                                                    onChange={() => this.dispatchAction(Actions.ON_USER_TOGGLE_IDP)}
                                                    isChecked={this.state.userSelectedIdp === IDP_PROVIDERS.KEYCLOAK}/>
                                                <Text
                                                    style={[Styles.formLabel, {paddingLeft: 12}]}>{this.I18n.t('Use Keycloak')}</Text>
                                            </View>
                                        </TouchableNativeFeedback>}
                                    <View style={styles.actionRow}>
                                        {this.canResetPassword ?
                                            <TouchableNativeFeedback onPress={() => {
                                                this.forgotPassword();
                                            }} background={TouchableNativeFeedback.SelectableBackground()}>
                                                <View>
                                                    <Text style={styles.forgetPasswordText}>{this.I18n.t('Forgot Password')}</Text>
                                                </View>
                                            </TouchableNativeFeedback>
                                            : <View/>}
                                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                            {_.get(this, 'props.params.allowSkipLogin') &&
                                                <TouchableNativeFeedback onPress={() => {
                                                    this.cancelLogin();
                                                }} background={TouchableNativeFeedback.SelectableBackground()}>
                                                    <View style={[styles.skipButton, {marginRight: 12}]}>
                                                        <Text style={styles.skipButtonText}>SKIP</Text>
                                                    </View>
                                                </TouchableNativeFeedback>
                                            }
                                            <TouchableNativeFeedback onPress={this.safeLogin}
                                                                     background={TouchableNativeFeedback.SelectableBackground()}>
                                                <View style={styles.loginButton}>
                                                    <Text style={styles.loginButtonText}>{this.I18n.t('LOGIN')}</Text>
                                                </View>
                                            </TouchableNativeFeedback>
                                        </View>
                                    </View>
                                </View>
                            </View>
                            <View style={{
                                flexDirection: 'column',
                                justifyContent: 'flex-end',
                                alignItems: 'center',
                                minHeight: height * 0.15,
                                paddingLeft: 16
                            }}>
                                <Text style={styles.footerText}>Powered by Avni (Version {DeviceInfo.getVersion()}-{Config.COMMIT_ID})</Text>
                                {!EnvironmentConfig.isProd() &&
                                    <>
                                        <Text style={{
                                            fontSize: Styles.normalTextSize,
                                            fontStyle: 'normal',
                                            color: Styles.blackColor,
                                            marginVertical: 0,
                                        }}>{Config.ENV}</Text>
                                        <Text style={Styles.textList}>Actual Schema Version : <Text
                                            style={{
                                                color: 'black',
                                                fontSize: Styles.normalTextSize
                                            }}>{this.getService(EntityService).getActualSchemaVersion()}</Text></Text>
                                        <Text style={Styles.textList}>Code Schema Version: <Text
                                            style={{
                                                color: 'black',
                                                fontSize: Styles.normalTextSize
                                            }}>{EntityMappingConfig.getInstance().getSchemaVersion()}</Text></Text>
                                    </>
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
            .then(() => LocalCacheService.clearCache())
            .then(() => this.getService(AuthService).fetchAuthSettingsFromServer())
            .catch(error => getAvniError(error, this.i18n).then(avniError => AlertMessage(this.i18n.t('Error'), avniError.getDisplayMessage())))
            .then(() => this.reset())
            .then(() => this.justLogin())
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
            this.showMultiUserLoginFailure();
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
        General.logDebug('LoginView', `onLoginProgress ${message}`);
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
            checkForRetry: (error, source) => this.restoreFailureAlert(error, source),
            successCb: (source) => this.loginComplete(source),
            successCBFromSetPasswordView: (source) => this.successCBFromSetPasswordView(source),
        };
    }
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.WhiteContentBackground,
        borderRadius: 8,
        padding: 16
    },
    cardTitle: {
        color: Colors.TextSecondary,
        fontSize: 18,
        fontWeight: '500',
        marginBottom: 16
    },
    errorText: {
        color: Colors.ValidationError,
        marginBottom: 12
    },
    fieldContainer: {
        flexDirection: 'column',
        justifyContent: 'flex-start',
        marginBottom: 16
    },
    fieldLabel: {
        marginBottom: 4
    },
    fieldInput: {
        borderWidth: 1,
        borderColor: Colors.TextHint,
        borderRadius: 4,
        paddingHorizontal: 12,
        height: 56,
        justifyContent: 'center'
    },
    // Input box + icon in one flex row, so the icon centers vertically via alignItems instead of
    // an absolute offset guessed against the label's height (which was drifting off-center).
    passwordInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.TextHint,
        borderRadius: 4,
        height: 56,
        paddingLeft: 12
    },
    passwordTextInput: {
        flex: 1,
        fontSize: Styles.normalTextSize,
        paddingVertical: 0
    },
    eyeIconButton: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center'
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8
    },
    forgetPasswordText: {
        color: Colors.BrandSecondary,
        fontSize: Styles.smallTextSize
    },
    skipButton: {
        minHeight: 48,
        minWidth: 90,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: Colors.BorderDefault,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16
    },
    skipButtonText: {
        color: Colors.TextPrimaryDark,
        fontSize: 16
    },
    loginButton: {
        minHeight: 48,
        minWidth: 120,
        borderRadius: 8,
        backgroundColor: Colors.BrandPrimaryDark,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16
    },
    loginButtonText: {
        color: Styles.whiteColor,
        fontSize: 16
    },
    footerText: {
        color: Colors.TextHint
    }
});

export default LoginView;
