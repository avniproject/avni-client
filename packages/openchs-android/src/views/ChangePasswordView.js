import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../framework/view/AbstractComponent";
import Path from "../framework/routing/Path";
import {Text, View, TouchableNativeFeedback, StyleSheet} from "react-native";
import Styles from "./primitives/Styles";
import {Checkbox as CheckBox, Spinner} from "native-base";
import CHSContainer from "./common/CHSContainer";
import CHSContent from "./common/CHSContent";
import AppHeader from "./common/AppHeader";
import AuthService from "../service/AuthService";
import CHSNavigator from "../utility/CHSNavigator";
import Colors from "./primitives/Colors";
import Distances from "./primitives/Distances";
import General from "../utility/General";
import TypedTransition from "../framework/routing/TypedTransition";
import {SecureTextInput} from "./common/SecureTextInput";

@Path('/changePasswordView')
class ChangePasswordView extends AbstractComponent {
    static propTypes = {
        user: PropTypes.object
    };

    constructor(props, context) {
        super(props, context);
    }

    forgotPassword() {
        CHSNavigator.navigateToForgotPasswordView(this);
    }

    UNSAFE_componentWillMount() {
        this.setState(() => {
            return {showPassword: false, showSpinner: false, password: '', newPassword: '', userId: ''}
        });
        let authService = this.context.getService(AuthService);
        authService.getAuthProviderService().getAuthToken().then(
            () => {
                authService.getAuthProviderService().getUserName().then(
                    (username) => {
                        this.setState(() => {
                            return {userId: username}
                        })
                    })
            },
            () => {
                CHSNavigator.navigateToLoginView(this, (source) => CHSNavigator.navigateToChangePasswordView(source, true));
            }
        )
    }

    errorMessage() {
        const error = this.state.errorMessage || '';
        return this.I18n.t(error.slice(error.indexOf(":") + 1).trim());
    }

    changePassword() {
        this.setState(() => {
            return {showSpinner: true}
        });

        this.context.getService(AuthService).getAuthProviderService()
            .changePassword(this.state.password, this.state.newPassword)
            .then(
                () => {
                    this.setState(() => {
                        showSpinner: false
                    });
                    CHSNavigator.navigateToLandingView(this, true, {tabIndex: 1, menuProps: {startSync: false}})
                },
                (error) => {
                    this.setState(() => {
                        return {errorMessage: error.message, showSpinner: false}
                    });
                }
            );
    }

    spinner() {
        return this.state.showSpinner ? (
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

    onToggleShowPassword() {
        this.setState((oldState) => {
            return {showPassword: !oldState.showPassword}
        });
    }

    viewName() {
        return "ChangePasswordView";
    }

    onHardwareBackPress() {
        TypedTransition.from(this).goBack();
        return true;
    }

    render() {
        General.logDebug(this.viewName(), 'render');
        return (
            <CHSContainer>
                <AppHeader title={this.I18n.t('changePassword')} hideIcon={true}/>
                <CHSContent>
                    <View style={{
                        paddingHorizontal: Distances.ScaledContentDistanceFromEdge,
                        paddingBottom: 72,
                        paddingTop: 40,
                        flexDirection: 'column',
                        justifyContent: 'flex-start'
                    }}>

                        <Text
                            style={Styles.formLabel}>{`${this.I18n.t("changePasswordFor", {userId: this.state.userId})}`}</Text>
                        <Text style={{
                            color: Colors.ValidationError,
                            justifyContent: 'center'
                        }}>{this.errorMessage()}</Text>

                        <SecureTextInput placeholder={this.I18n.t("currentPassword")} value={this.state.password}
                                         onChangeText={(password) => this.setState({password})}
                                         secureTextEntry={!this.state.showPassword}
                                         style={styles.textInput}
                        />

                        <SecureTextInput placeholder={this.I18n.t("newPassword")} value={this.state.newPassword}
                                         onChangeText={(newPassword) => this.setState({newPassword})}
                                         secureTextEntry={!this.state.showPassword}
                                         style={styles.textInput}
                        />

                        <View style={{
                            flexDirection: 'column',
                            paddingBottom: 16,
                            paddingTop: 8
                        }}>
                                    <TouchableNativeFeedback onPress={() => {
                                        this.onToggleShowPassword()
                                    }}>
                                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                            <CheckBox isChecked={this.state.showPassword} onChange={() => {
                                                this.onToggleShowPassword()
                                            }}/>
                                            <Text style={[Styles.formLabel, {paddingLeft: 12}]}>{this.I18n.t("showPasswords")}</Text>
                                        </View>
                                    </TouchableNativeFeedback>
                        </View>

                        {/* Same row layout as LoginView's actionRow - forgot-password link on the
                            left, primary button on the right. */}
                        <View style={styles.actionRow}>
                            <TouchableNativeFeedback onPress={() => {
                                this.forgotPassword()
                            }} background={TouchableNativeFeedback.SelectableBackground()}>
                                <View style={{flexDirection: 'row'}}>
                                    <Text style={{
                                        color: Colors.BrandSecondary,
                                        fontSize: 16
                                    }}>{this.I18n.t("forgotPassword")}</Text>
                                </View>
                            </TouchableNativeFeedback>
                            <TouchableNativeFeedback onPress={() => {
                                this.changePassword()
                            }} background={TouchableNativeFeedback.SelectableBackground()}>
                                <View style={styles.changePasswordButton}>
                                    <Text style={{color: Styles.whiteColor, fontSize: 16}}>{this.I18n.t('changePassword')}</Text>
                                </View>
                            </TouchableNativeFeedback>
                        </View>

                        {this.spinner()}
                    </View>
                </CHSContent>
            </CHSContainer>
        )

    }
}

const styles = StyleSheet.create({
    // Boxed look matching LoginView's fieldInput/passwordInputRow, instead of the plain underline
    // style this screen used before.
    textInput: {
        borderWidth: 1,
        borderColor: Colors.TextHint,
        borderRadius: 4,
        paddingHorizontal: 12,
        height: 56,
        marginBottom: 16
    },
    changePasswordButton: {
        minHeight: 48,
        borderRadius: 8,
        backgroundColor: Colors.BrandPrimaryDark,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        paddingHorizontal: 16
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    }
});

export
default
ChangePasswordView;
