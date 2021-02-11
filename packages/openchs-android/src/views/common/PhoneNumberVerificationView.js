import AbstractComponent from "../../framework/view/AbstractComponent";
import React from 'react';
import {Button, NetInfo, Text, TouchableOpacity, View} from "react-native";
import OrganisationConfigService from "../../service/OrganisationConfigService";
import AppHeader from "./AppHeader";
import Styles from "../primitives/Styles";
import SmoothPinCodeInput from "react-native-smooth-pincode-input";
import Colors from "../primitives/Colors";
import PropTypes from "prop-types";
import Path from "../../framework/routing/Path";
import CHSContainer from "./CHSContainer";
import CHSContent from "./CHSContent";
import PhoneVerificationService from "../../service/PhoneVerificationService";
import SettingsService from "../../service/SettingsService";

@Path('/phoneNumberVerificationView')
class PhoneNumberVerificationView extends AbstractComponent {

    static propTypes = {
        next: PropTypes.func,
        onSuccessVerification: PropTypes.func,
        phoneNumber: PropTypes.string,
    };

    constructor(props, context) {
        super(props, context);
        this.resendSeconds = 30;
        this.optLength = context.getService(OrganisationConfigService).getOTPLength();
        this.pinInput = React.createRef();
        this.state = {code: '', seconds: this.resendSeconds, attempt: 0, isConnected: true};
        this.onResendCode = this.onResendCode.bind(this);
        this.phoneNumber = this.props.phoneNumber;
        this.phoneVerificationService = this.getService(PhoneVerificationService);
        this.serverURL = this.getService(SettingsService).getSettings().serverURL;
    }

    verifyOTP() {
        const onSuccessVerification = () => {
            this.props.onSuccessVerification();
            this.goBack();
        };
        this.phoneVerificationService.verifyOTP(this.phoneNumber, this.state.code, this.optLength, this.serverURL, onSuccessVerification)
    }

    viewName() {
        return 'PhoneNumberVerificationView';
    }

    componentWillMount() {
        this.phoneVerificationService.sendOTP(this.phoneNumber, this.optLength, this.serverURL);
        let timer = this.getInterval();
        this.setState({timer});
        this.checkInternetConnection();
        return super.componentWillMount();
    }

    checkInternetConnection() {
        NetInfo.isConnected.fetch().then(isConnected => {
            this.setState(preState => ({...preState, isConnected}))
        })
    }

    getInterval() {
        return setInterval(() => {
            this.setState(prevState => ({...prevState, seconds: prevState.seconds - 1}))
        }, 1000);
    }

    componentWillUnmount() {
        clearInterval(this.state.timer);
    }

    onResendCode() {
        this.phoneVerificationService.resendOTP(this.phoneNumber, this.optLength, this.serverURL);
        const attempt = this.state.attempt + 1;
        this.setState(prevState => ({...prevState, attempt, seconds: this.resendSeconds, timer: this.getInterval()}));
    }

    renderTimer() {
        return (this.state.seconds === 0 ?
                <View style={{marginTop: 20, flexDirection: 'row', justifyContent: 'center'}}>
                    <Text style={{alignSelf: 'center', paddingBottom: 10}}>{this.I18n.t("codeNotReceived")}</Text>
                    <TouchableOpacity onPress={() => this.onResendCode()}>
                        <Text
                            style={{paddingLeft: 2, color: Colors.ActionButtonColor}}>{this.I18n.t("resendCode")}</Text>
                    </TouchableOpacity>
                </View>
                : <Text style={{
                    marginTop: 20,
                    alignSelf: 'center'
                }}>{this.I18n.t("getAnotherOTPIn", {seconds: this.state.seconds})}</Text>
        )
    }

    next() {
        const skipVerification = true;
        this.props.next(skipVerification);
    }

    render() {
        if (this.state.seconds === 0) {
            clearInterval(this.state.timer);
        }
        const mobileNumber = this.phoneNumber;
        const renderSkipOption = this.state.attempt >= 2 || !this.state.isConnected;
        return (
            <CHSContainer>
                <CHSContent ref="scroll">
                    <AppHeader title={this.I18n.t("OTPVerification")} func={() => this.goBack()} hideIcon={true}/>
                    <View style={{flex: 1, flexDirection: 'column', paddingVertical: 100, paddingHorizontal: 20}}>
                        <Text style={Styles.menuTitle}>{this.I18n.t("OTPVerification")}</Text>
                        <Text style={{paddingTop: 10, alignSelf: 'center'}}>{this.I18n.t("enterOTP")}</Text>
                        <View style={{flexDirection: 'row', justifyContent: 'center'}}>
                            <Text style={{alignSelf: 'center', paddingBottom: 10}}>{mobileNumber}</Text>
                            <TouchableOpacity onPress={() => this.goBack()}>
                                <Text style={{
                                    paddingLeft: 2,
                                    color: Colors.ActionButtonColor
                                }}>{this.I18n.t("change")}</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={{marginVertical: 16, alignSelf: 'center'}}>
                            <SmoothPinCodeInput
                                ref={this.pinInput}
                                codeLength={this.optLength}
                                value={this.state.code}
                                autoFocus={true}
                                onTextChange={code => this.setState({code})}
                            />
                        </View>
                        {renderSkipOption &&
                        <View style={{marginTop: 20}}>
                            <Button
                                title={this.I18n.t("skipOTPVerification")}
                                color={Colors.ActionButtonColor}
                                onPress={() => this.next()}
                            />
                        </View>}
                        <View style={{marginTop: 20}}>
                            <Button
                                title={this.I18n.t("verifyOPT")}
                                color={Colors.ActionButtonColor}
                                onPress={() => this.verifyOTP()}
                                disabled={this.state.code.length < this.optLength}
                            />
                        </View>
                        {this.renderTimer()}
                    </View>
                </CHSContent>
            </CHSContainer>
        )
    }

}

export default PhoneNumberVerificationView
