import React, {Component} from 'react';
import {ScrollView, StyleSheet, Text, ToastAndroid, TouchableOpacity, View} from 'react-native';
import BeneficiaryModePinService from "../../service/BeneficiaryModePinService";
import BeneficiaryDashboard from "../beneficiaryMode/BeneficiaryDashboard";
import SubjectDashboardView from "./SubjectDashboardView";
import Path from "../../framework/routing/Path";
import AbstractComponent from "../../framework/view/AbstractComponent";

@Path('/GenericDashboardView')
class GenericDashboardView extends AbstractComponent {
    constructor(props, context) {
        super(props, context);
    }

    render() {
        if (this.context.getService(BeneficiaryModePinService).inBeneficiaryMode()) {
            const props = {...this.props, beneficiaryUUID: this.props.individualUUID};
            return <BeneficiaryDashboard {...props}/>;
        }
        const props = this.props.params || this.props;
        return <SubjectDashboardView {...props}/>;
    }
}

export default GenericDashboardView;