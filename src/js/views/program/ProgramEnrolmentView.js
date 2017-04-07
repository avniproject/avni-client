import {View, StyleSheet} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import ProgramFormComponent from './ProgramFormComponent';
import {Actions} from "../../action/program/ProgramEnrolmentActions";
import ProgramEnrolment from "../../models/ProgramEnrolment";
import ProgramEnrolmentState from '../../action/program/ProgramEnrolmentState';
import ObservationsHolder from "../../models/ObservationsHolder";
import Reducers from "../../reducer";

@Path('/ProgramEnrolmentView')
class ProgramEnrolmentView extends AbstractComponent {
    static propTypes = {
        params: React.PropTypes.object.isRequired
    };

    static usageContext = {
        usage: ProgramEnrolmentState.UsageKeys.Enrol,
        dateAction: Actions.ENROLMENT_DATE_TIME_CHANGED,
        dateKey: 'enrolmentDate',
        dateField: 'enrolmentDateTime',
        dateValidationKey: ProgramEnrolment.validationKeys.ENROLMENT_DATE
    };

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.programEnrolment);
    }

    viewName() {
        return "ProgramEnrolmentView";
    }

    componentWillMount() {
        this.dispatchAction(Actions.ON_LOAD, {enrolment: this.props.params.enrolment, usage: ProgramEnrolmentView.usageContext.usage});
        return super.componentWillMount();
    }

    render() {
        console.log('ProgramEnrolmentView.render');
        return <ProgramFormComponent state={this.state} context={ProgramEnrolmentView.usageContext}/>;
    }
}

export default ProgramEnrolmentView;