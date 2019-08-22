import React from "react";
import {Text, View} from "react-native";
import Path from "../../framework/routing/Path";
import AbstractComponent from "../../framework/view/AbstractComponent";
import AppHeader from "../common/AppHeader";
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
import Pin from "../common/Pin";

@Path('/beneficiaryModeLoginView')
class BeneficiaryModeStartView extends AbstractComponent {
    constructor(props, context) {
        super(props, context);
    }

    viewName() {
        return 'BeneficiaryModeView';
    }

    componentWillMount() {
        super.componentWillMount();
    }

    render() {
        return (
            <CHSContainer>
                <CHSContent>
                    <AppHeader title={this.I18n.t('beneficiaryMode')}/>
                    <Pin/>
                </CHSContent>
            </CHSContainer>
        );
    }
}

export default BeneficiaryModeStartView;