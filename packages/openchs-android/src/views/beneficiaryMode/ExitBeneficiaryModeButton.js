import {Modal, Text, TouchableNativeFeedback, View} from "react-native";
import React from "react";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Colors from "../primitives/Colors";
import BeneficiaryModePinService from "../../service/BeneficiaryModePinService";
import Pin from "../common/Pin";
import CHSNavigator from "../../utility/CHSNavigator";


class ExitBeneficiaryModeButton extends AbstractComponent {
    viewName() {
        return "ExitBeneficiaryModeButton";
    }

    componentWillMount() {
        this.resetState();
    }

    resetState() {
        this.setState({showPinModal: false, attempts: 0, errorMessage: false});
    }

    showPinModal() {
        this.setState({showPinModal: true, attempts: 0, errorMessage: false})
    }

    exitBeneficiaryMode(pin) {
        let beneficiaryModePinService = this.context.getService(BeneficiaryModePinService);
        if (beneficiaryModePinService.pinMatches(pin)) {
            beneficiaryModePinService.resetPin();
            this.resetState();
            CHSNavigator.navigateToLandingView(this, true);
        } else {
            if (this.state.attempts >= 2) {
                this.resetState();
                beneficiaryModePinService.resetPin();
                CHSNavigator.navigateToLoginView(this, true);
            }
            this.setState({
                attempts: this.state.attempts + 1,
                errorMessage: true
            });
        }
    }

    render() {
        return (
            <View>
                <TouchableNativeFeedback
                    onPress={() => this.showPinModal()}>
                    <View style={{
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'flex-end',
                        height: 56,
                        width: 72,
                        paddingHorizontal: 16,
                    }}>
                        <Icon style={{fontSize: 30, color: Colors.headerIconColor}} name='logout'/>
                    </View>
                </TouchableNativeFeedback>
                <Modal onRequestClose={() => this.resetState()}
                       visible={this.state.showPinModal}
                >
                    {this.state.attempts > 0 && (
                        <Text style={{color: 'red'}}>{this.I18n.t("invalidLogoutAttempt", {attempts: this.state.attempts})}</Text>
                    )}
                    <Pin onComplete={(pin) => this.exitBeneficiaryMode(pin)}/>
                </Modal>
            </View>
        );
    }

}

export default ExitBeneficiaryModeButton;
