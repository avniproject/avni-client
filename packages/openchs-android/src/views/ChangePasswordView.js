import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../framework/view/AbstractComponent";
import Path from "../framework/routing/Path";
import {Text, View, TextInput, TouchableNativeFeedback} from "react-native";
import Styles from "./primitives/Styles";
import {CheckBox, Spinner} from "native-base";
import CHSContainer from "./common/CHSContainer";
import CHSContent from "./common/CHSContent";
import themes from "./primitives/themes";
import AuthService from "../service/AuthService";
import CHSNavigator from "../utility/CHSNavigator";
import Colors from "./primitives/Colors";
import General from "../utility/General";

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

    componentWillMount() {
        this.setState(() => {
            return {showPassword: false, showSpinner: false, password: '', newPassword: '', userId: ''}
        });

        let authService = this.context.getService(AuthService);
        authService.getAuthToken().then(
            () => {
                authService.getUser().then(
                    (user) => {
                        this.setState(() => {
                            return {userId: user.getUsername()}
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
        return error.slice(error.indexOf(":") + 1).trim();
    }

    changePassword() {
        this.setState(() => {
            return {showSpinner: true}
        });

        this.context.getService(AuthService).changePassword(this.state.password, this.state.newPassword).then(
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

    viewName() {
        return "ChangePasswordView";
    }

    render() {
        General.logDebug(this.viewName(), 'render');
        return (
            <CHSContainer theme={themes}>
                <CHSContent>
                    <View style={{
                        padding: 72,
                        paddingTop: 144,
                        flexDirection: 'column',
                        justifyContent: 'flex-start'
                    }}>

                        <Text
                            style={Styles.formLabel}>{`Change password for ${this.state.userId}`}</Text>
                        <Text style={{
                            color: Colors.ValidationError,
                            justifyContent: 'center'
                        }}>{this.errorMessage()}</Text>

                        <TextInput placeholder={"Current password"} value={this.state.password}
                                   onChangeText={(password) => this.setState({password})}
                                   secureTextEntry={!this.state.showPassword}/>

                        <TextInput placeholder={"New password"} value={this.state.newPassword}
                                   onChangeText={(newPassword) => this.setState({newPassword})}
                                   secureTextEntry={!this.state.showPassword}/>

                        <View style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            paddingBottom: 16,
                            alignItems: 'center',
                            paddingTop: 8
                        }}>
                            <TouchableNativeFeedback onPress={() => this.setState((oldState) => {
                                return {showPassword: !oldState.showPassword}
                            })}>
                                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                    <CheckBox checked={this.state.showPassword}/>
                                    <Text style={[Styles.formLabel, {paddingLeft: 12}]}>{"Show passwords"}</Text>
                                </View>
                            </TouchableNativeFeedback>
                            <TouchableNativeFeedback onPress={() => {
                                this.forgotPassword()
                            }} background={TouchableNativeFeedback.SelectableBackground()}>
                                <View style={{flexDirection: 'row', justifyContent: 'flex-end'}}>
                                    <Text style={{color: Styles.accentColor, fontSize: 16}}>Forgot Password</Text>
                                </View>
                            </TouchableNativeFeedback>
                        </View>

                        <TouchableNativeFeedback onPress={() => {
                            this.changePassword()
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

export
default
ChangePasswordView;
