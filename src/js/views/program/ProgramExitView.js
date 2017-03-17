import {View, StyleSheet} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import ProgramFormComponent from './ProgramFormComponent';
import {Actions} from "../../action/prorgam/ProgramEnrolmentActions";
import ProgramEnrolment from "../../models/ProgramEnrolment";
import ProgramEnrolmentState from '../../action/prorgam/ProgramEnrolmentState';
import ObservationsHolder from "../../models/ObservationsHolder";

@Path('/ProgramExitView')
class ProgramExitView extends AbstractComponent {
    static propTypes = {
        params: React.PropTypes.object.isRequired
    };

    viewName() {
        return "ProgramExitView";
    }

    render() {
        console.log('ProgramExitView.render');
        const context = {
            usage: ProgramEnrolmentState.UsageKeys.Exit,
            dateAction: Actions.EXIT_DATE_TIME_CHANGED,
            dateKey: 'exitDate',
            dateField: 'programExitDateTime',
            dateValidationKey: ProgramEnrolment.validationKeys.EXIT_DATE
        };
        return <ProgramFormComponent enrolment={this.props.params.enrolment} context={context} observationHolder={new ObservationsHolder(this.props.params.enrolment.programExitObservations)}/>;
    }
}

export default ProgramExitView;