import {Modal, Text, TouchableNativeFeedback, View} from "react-native";
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Colors from "../primitives/Colors";
import BeneficiaryModePinService from "../../service/BeneficiaryModePinService";
import Pin from "../common/Pin";
import CHSNavigator from "../../utility/CHSNavigator";
import AvniIcon from '../common/AvniIcon';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';


class ExitBeneficiaryModeButton extends AbstractComponent {

    constructor(props, context) {
        super(props, context);
    }

    viewName() {
        return "ExitBeneficiaryModeButton";
    }

    UNSAFE_componentWillMount() {
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
            this.reset();
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
                        <AvniIcon style={{fontSize: 30, color: Colors.headerIconColor}} name='logout'
                                  type={MaterialIcons} color={ Colors.headerIconColor}/>
                    </View>
                </TouchableNativeFeedback>
                <Modal onRequestClose={() => this.resetState()}
                       visible={this.state.showPinModal}
                >
                    <View style={{height: 32, paddingVertical: 8, paddingHorizontal: 4}}>
                        {this.state.attempts > 0 && (
                            <Text style={{color: 'red'}}>
                                {this.I18n.t("invalidLogoutAttempt", {used: this.state.attempts, max: 3})}
                            </Text>
                        )}
                    </View>
                    <Pin reset={reset => this.reset = reset} I18n={this.I18n}
                         onComplete={(pin) => this.exitBeneficiaryMode(pin)}/>
                </Modal>
            </View>
        );
    }

}

export default ExitBeneficiaryModeButton;
