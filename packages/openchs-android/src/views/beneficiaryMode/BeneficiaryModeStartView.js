import React from "react";
import {Text, View} from "react-native";
import Path from "../../framework/routing/Path";
import AbstractComponent from "../../framework/view/AbstractComponent";
import AppHeader from "../common/AppHeader";
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
import Pin from "../common/Pin";
import BeneficiaryModePinService from "../../service/BeneficiaryModePinService";
import CHSNavigator from "../../utility/CHSNavigator";

@Path('/beneficiaryModeLoginView')
class BeneficiaryModeStartView extends AbstractComponent {
    constructor(props, context) {
        super(props, context);
    }

    viewName() {
        return 'BeneficiaryModeView';
    }

    onPinEnter(pin) {
        this.getService(BeneficiaryModePinService).setPin(pin);
        CHSNavigator.navigateToBeneficiaryIdentificationPage(this);
    }

    render() {
        return (
            <CHSContainer>
                <CHSContent>
                    <AppHeader title={this.I18n.t('beneficiaryMode')}/>
                    <Pin I18n={this.I18n} onComplete={(pin) => this.onPinEnter(pin)}/>
                </CHSContent>
            </CHSContainer>
        );
    }
}

export default BeneficiaryModeStartView;
