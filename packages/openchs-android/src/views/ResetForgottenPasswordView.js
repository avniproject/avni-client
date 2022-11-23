import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../framework/view/AbstractComponent";
import Path from "../framework/routing/Path";
import {Text, View, TextInput, TouchableNativeFeedback} from "react-native";
import Styles from "./primitives/Styles";
import {Checkbox as CheckBox, Spinner} from "native-base";
import CHSContainer from "./common/CHSContainer";
import CHSContent from "./common/CHSContent";
import themes from "./primitives/themes";
import AuthService from "../service/AuthService";
import CHSNavigator from "../utility/CHSNavigator";
import Colors from "./primitives/Colors";

@Path('/resetForgottenPasswordView')
class ResetForgottenPasswordView extends AbstractComponent {
    static propTypes = {
        user: PropTypes.object
    };

    constructor(props, context) {
        super(props, context);
    }

    UNSAFE_componentWillMount() {
        this.setState(() => {
            return {showPassword: false, showSpinner: false, verificationCode: ''}
        });
    }

    errorMessage() {
        const error = this.state.errorMessage || '';
        return error.slice(error.indexOf(":") + 1).trim();
    }

    passwordNotMatch = () => {
        if(this.state.password == this.state.ConfirmnewPassword)
        {
            this.setState({passwordNotMatchTest: ""})
            return true;
        }
        else{
            this.setState({passwordNotMatchTest: this.I18n.t(`confirm_password_error`)})
            return false;
        }
    }

    setNewPassword() {
        if(this.passwordNotMatch()){
            this.setState(() => {
                showSpinner: true
            });

            this.context.getService(AuthService).verifyOtpAndSetPassword(this.props.user, this.state.verificationCode, this.state.password).then(
                () => {
                    this.setState(() => {
                        showSpinner: false
                    });
                    alert(this.I18n.t(`forgot_password_changes_success_alert`))
                    CHSNavigator.navigateToLoginView(this, true);
                },
                (error) => {
                    this.setState(() => {
                        return {errorMessage: error.message, showSpinner: false}
                    });
                }
            );
        }
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

    render() {
        return (
            <CHSContainer>
                <CHSContent>
                    <View style={{
                        padding: 72,
                        paddingTop: 144,
                        flexDirection: 'column',
                        justifyContent: 'flex-start'
                    }}>

                        <Text
                            style={Styles.formLabel}>{`Enter new password for ${this.props.user.getUsername()}`}</Text>
                        <Text style={{
                            color: Colors.ValidationError,
                            justifyContent: 'center'
                        }}>{this.errorMessage()}</Text>

                        <Text style={{
                            color: Colors.ValidationError,
                            justifyContent: 'center'
                        }}>{this.state.passwordNotMatchTest}</Text>

                        <TextInput style={{borderBottomColor:'#cccccc',borderBottomWidth: 1 }}
                                   placeholder={"Enter OTP"} value={this.state.verificationCode} keyboardType={"numeric"}
                                   onChangeText={(verificationCode) => this.setState({verificationCode})}/>

                        <TextInput style={{borderBottomColor:'#cccccc',borderBottomWidth: 1 }}
                                   placeholder={"Enter New password"} value={this.state.password}
                                   onChangeText={(password) => this.setState({password})}
                                   secureTextEntry={!this.state.showPassword}/>

                        <TextInput style={{borderBottomColor:'#cccccc',borderBottomWidth: 1 }}
                                   placeholder={"Confirm New Password"} value={this.state.ConfirmnewPassword}
                                   onChangeText={(ConfirmnewPassword) => this.setState({ConfirmnewPassword})}
                                   secureTextEntry={!this.state.showPassword}/>

                        <TouchableNativeFeedback onPress={() => this.setState((oldState) => {
                            return {showPassword: !oldState.showPassword}
                        })}>
                            <View style={{flexDirection: 'row', alignItems: 'center', paddingTop:10}}>
                                <CheckBox checked={this.state.showPassword}/>
                                <Text style={[Styles.formLabel, {paddingLeft: 12}]}>{"Show password"}</Text>
                            </View>
                        </TouchableNativeFeedback>

                        <TouchableNativeFeedback onPress={() => {
                            this.setNewPassword()
                        }}
                                                 background={TouchableNativeFeedback.SelectableBackground()}>
                            <View style={[Styles.basicPrimaryButtonView, {width: 144, marginTop: 16}]}>
                                <Text style={{color: Styles.whiteColor, fontSize: 16}}>Change Password</Text>
                            </View>
                        </TouchableNativeFeedback>

                        {this.spinner()}
                    </View>
                </CHSContent>
            </CHSContainer>
        )

    }
}

export default ResetForgottenPasswordView;
