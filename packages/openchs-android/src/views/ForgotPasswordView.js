import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../framework/view/AbstractComponent";
import Path from "../framework/routing/Path";
import {Image, Text, View, Dimensions, TextInput, TouchableNativeFeedback, StyleSheet} from "react-native";
import AuthService from "../service/AuthService";
import Styles from "./primitives/Styles";
import Distances from "./primitives/Distances";
import CHSNavigator from "../utility/CHSNavigator";
import {Spinner} from "native-base";
import Colors from "./primitives/Colors";
import General from "../utility/General";
import CHSContent from "./common/CHSContent";
import CHSContainer from "./common/CHSContainer";
import AppHeader from "./common/AppHeader";
import TypedTransition from "../framework/routing/TypedTransition";

@Path('/forgotPasswordView')
class ForgotPasswordView extends AbstractComponent {
    static propTypes = {};

    constructor(props, context) {
        super(props, context);
    }

    UNSAFE_componentWillMount() {
        this.setState(() => {return { userId: '', showSpinner: false }});
    }

    sendOTP() {
        this.setState(() => {return {showSpinner: true}});
        this.context.getService(AuthService).getAuthProviderService().forgotPassword(this.state.userId).then(
            (response) => {
                this.setState(() => {return {showSpinner: false}});
                if (response.status === "SUCCESS") {
                    CHSNavigator.navigateToLoginView(this, true);
                }
                if (response.status === "INPUT_VERIFICATION_CODE") {
                    alert(this.I18n.t(`forgot_password_OPT_sent_alert`))
                    CHSNavigator.navigateToResetPasswordView(this, response.user);
                }
            },
            (error) => {
                this.setState(() => {return {showSpinner: false, errorMessage: error.message}});
            }
        )
    }

    onViewDidMount() {
        this.context.getService(AuthService).getAuthProviderService().getUser().then(user => {
            if (user !== null) {
                this.setState(() => {
                    return {userId: user.getUsername()}
                });
            }
        });
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

    errorMessage() {
        const error = this.state.errorMessage || '';
        return this.I18n.t(error.slice(error.indexOf(":") + 1).trim());
    }

    get containerStyle() {
        return {
            paddingHorizontal: 16,
            paddingTop: 40,
            flexDirection: 'column',
            minHeight: Distances.DeviceHeight,
            justifyContent: 'flex-start',
            backgroundColor: Colors.GreyContentBackground
        }
    }

    viewName() {
        return "ForgotPasswordView";
    }

    onHardwareBackPress() {
        TypedTransition.from(this).goBack();
        return true;
    }

    render() {
        General.logDebug(this.viewName(), 'render');
        const errorMessage = this.errorMessage();
        return <CHSContainer style={{backgroundColor: Colors.GreyContentBackground}}>
            <AppHeader title={this.I18n.t('forgotPassword')} hideIcon={true}/>
            <CHSContent>
                <View style={this.containerStyle}>
                    <View style={styles.card}>
                        <Text style={[Styles.formLabel, {color: Colors.TextSecondary, marginBottom: 16}]}>
                            {this.I18n.t(`forgot_password_first_page_note`)}
                        </Text>
                        {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
                        <View style={styles.fieldInput}>
                            <TextInput style={{fontSize: Styles.normalTextSize, paddingVertical: 0}}
                                       underlineColorAndroid={'transparent'}
                                       placeholder={this.I18n.t('forgot_password_userId_placeholder')}
                                       placeholderTextColor={Colors.TextHint}
                                       value={this.state.userId}
                                       onChangeText={(userId) => this.setState({userId})}
                                       autoCapitalize={"none"}
                                       keyboardType={'email-address'}
                            />
                        </View>
                        <TouchableNativeFeedback onPress={() => {
                            this.sendOTP()
                        }} background={TouchableNativeFeedback.SelectableBackground()}>
                            <View style={styles.sendOtpButton}>
                                <Text style={styles.sendOtpButtonText}>{this.I18n.t('Send OTP')}</Text>
                            </View>
                        </TouchableNativeFeedback>
                    </View>
                    {this.spinner()}
                </View>
            </CHSContent>
        </CHSContainer>
    }
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.WhiteContentBackground,
        borderRadius: 8,
        padding: 16
    },
    errorText: {
        color: Colors.ValidationError,
        marginBottom: 12
    },
    fieldInput: {
        borderWidth: 1,
        borderColor: Colors.TextHint,
        borderRadius: 4,
        paddingHorizontal: 12,
        height: 56,
        justifyContent: 'center',
        marginBottom: 16
    },
    sendOtpButton: {
        minHeight: 48,
        minWidth: 120,
        borderRadius: 8,
        backgroundColor: Colors.BrandPrimaryDark,
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'flex-end',
        paddingHorizontal: 16
    },
    sendOtpButtonText: {
        color: Styles.whiteColor,
        fontSize: 16
    }
});

export default ForgotPasswordView;
