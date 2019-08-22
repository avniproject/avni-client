import React from 'react';
import PropTypes from 'prop-types';
import {Text, View} from 'react-native';
import AbstractComponent from "../../framework/view/AbstractComponent";
import Reducers from "../../reducer";
import Actions from '../../action/beneficiarymode/BeneficiaryDashboardActions';
import Path from "../../framework/routing/Path";

@Path('/BeneficiaryDashboard')
export default class BeneficiaryDashboard extends AbstractComponent {
    static propTypes = {
        beneficiary: PropTypes.object.isRequired
    };

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.beneficiaryDashboard);
    }

    viewName() {
        return "BeneficiaryDashboard";
    }

    componentWillMount() {
        this.dispatchAction(Actions.onLoad, {
            beneficiary: this.props.beneficiary,
        });
        super.componentWillMount();
    }

    render() {
        return <View>
            <Text>{JSON.stringify(this.props.beneficiary)}</Text>
        </View>
    }
}