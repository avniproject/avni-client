import React from "react";
import AbstractComponent from "../framework/view/AbstractComponent";
import Path from "../framework/routing/Path";
import {Image, Text, View, Dimensions, TextInput, TouchableNativeFeedback} from "react-native";
import AuthService from "../service/AuthService";
import Styles from "./primitives/Styles";
import Distances from "./primitives/Distances";
import CHSNavigator from "../utility/CHSNavigator";
import {Spinner} from "native-base";
import Colors from "./primitives/Colors";
import General from "../utility/General";

@Path('/forgotPasswordView')
class ForgotPasswordView extends AbstractComponent {
    static propTypes = {};

    constructor(props, context) {
        super(props, context);
    }

    componentWillMount() {
        this.setState(() => {return { userId: '', showSpinner: false }});
    }

    sendOTP() {
        this.setState(() => {return {showSpinner: true}});
        this.context.getService(AuthService).forgotPassword(this.state.userId).then(
            (response) => {
                this.setState(() => {return {showSpinner: false}});
                if (response.status === "SUCCESS") {
                    CHSNavigator.navigateToLoginView(this, true);
                }
                if (response.status === "INPUT_VERIFICATION_CODE") {
                    CHSNavigator.navigateToResetPasswordView(this, response.user);
                }
            },
            (error) => {
                this.setState(() => {return {showSpinner: false, errorMessage: error.message}});
            }
        )
    }

    componentDidMount() {
        this.context.getService(AuthService).getUser().then(user => {
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
        return error.slice(error.indexOf(":") + 1).trim();
    }

    get containerStyle() {
        return {
            padding: 72,
            paddingTop: 144,
            flexDirection: 'column',
            height: Distances.DeviceHeight,
            justifyContent: 'flex-start'
        }
    }

    viewName() {
        return "ForgotPasswordView";
    }

    render() {
        General.logDebug(this.viewName(), 'render');
        return <View style={this.containerStyle}>
            <Text style={{
                color: Colors.ValidationError,
                justifyContent: 'center'
            }}>{this.errorMessage()}</Text>

            <TextInput placeholder={this.I18n.t('userId')} value={this.state.userId}
                       onChangeText={(userId) => this.setState({userId})}/>
            <TouchableNativeFeedback onPress={() => {
                this.sendOTP()
            }} background={TouchableNativeFeedback.SelectableBackground()}>
                <View style={[Styles.basicPrimaryButtonView, {width: 144, marginTop: 16, alignSelf: 'flex-end'}]}>
                    <Text style={{color: Styles.whiteColor, fontSize: 16}}>Send OTP</Text>
                </View>
            </TouchableNativeFeedback>
            {this.spinner()}
        </View>;
    }
}

export default ForgotPasswordView;