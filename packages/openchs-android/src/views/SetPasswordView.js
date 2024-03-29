import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../framework/view/AbstractComponent";
import Path from "../framework/routing/Path";
import {Text, TouchableNativeFeedback, View} from "react-native";
import Styles from "./primitives/Styles";
import {Checkbox as CheckBox, Spinner} from "native-base";
import CHSContainer from "./common/CHSContainer";
import CHSContent from "./common/CHSContent";
import AuthService from "../service/AuthService";
import Colors from "./primitives/Colors";
import DBRestoreProgress from "./DBRestoreProgress";
import {SecureTextInput} from "./common/SecureTextInput";

@Path('/setPasswordView')
class SetPasswordView extends AbstractComponent {
    static propTypes = {
        user: PropTypes.object,
        onSuccessCB: PropTypes.func,
    };

    constructor(props, context) {
        super(props, context);
    }

    viewName() {
        return "SetPasswordView";
    }

    UNSAFE_componentWillMount() {
        this.setState(() => {
            return {showPassword: false, showSpinner: false}
        });
    }

    errorMessage() {
        const error = this.state.errorMessage || '';
        return this.I18n.t(error.slice(error.indexOf(":") + 1).trim());
    }

    setNewPassword() {
        this.setState(() => {
            return {showSpinner: true};
        });
        this.context.getService(AuthService).getAuthProviderService().completeNewPasswordChallenge(this.props.user, this.state.password).then(
            () => {
                this.setState(() => {
                    return {showSpinner: false}
                });
                this.props.onSuccessCB(this);
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

    render() {
        const onShowPasswordChangeHandler = (isSelected) => {
            this.setState(prevState => {
                return {...prevState, showPassword: isSelected};
            });
        }

        return (
            <CHSContainer>
                <DBRestoreProgress/>
                <CHSContent>
                    <View style={{
                        padding: 72,
                        paddingTop: 144,
                        flexDirection: 'column',
                        justifyContent: 'flex-start'
                    }}>

                        <Text
                          style={Styles.formLabel}>{this.I18n.t("enterNewPasswordFor", {userName: this.props.user.getUsername()})}</Text>
                        <Text style={{
                            color: Colors.ValidationError,
                            justifyContent: 'center'
                        }}>{this.errorMessage()}</Text>

                        <SecureTextInput placeholder={this.I18n.t("password")} value={this.state.password}
                                   onChangeText={(password) => this.setState({password})}
                                   secureTextEntry={!this.state.showPassword}
                        />
                        <TouchableNativeFeedback onPress={() => this.setState((oldState) => {
                            return {showPassword: !oldState.showPassword}
                        })}>
                            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                <CheckBox value={this.state.showPassword} onChange={onShowPasswordChangeHandler}/>
                                <Text style={[Styles.formLabel, {paddingLeft: 12}]}>{this.I18n.t("Show password")}</Text>
                            </View>
                        </TouchableNativeFeedback>

                        <TouchableNativeFeedback onPress={() => {
                            this.setNewPassword()
                        }}
                                                 background={TouchableNativeFeedback.SelectableBackground()}>
                            <View style={[Styles.basicPrimaryButtonView, {width: 144, marginTop: 16}]}>
                                <Text style={{color: Styles.whiteColor, fontSize: 16}}>{this.I18n.t("changePassword")}</Text>
                            </View>
                        </TouchableNativeFeedback>

                        {this.spinner()}
                    </View>
                </CHSContent>
            </CHSContainer>
        )

    }
}

export default SetPasswordView;
