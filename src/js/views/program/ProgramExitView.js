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
import General from "../../utility/General";

@Path('/ProgramExitView')
class ProgramExitView extends AbstractComponent {
    static propTypes = {
        params: React.PropTypes.object.isRequired
    };

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.programEnrolment);
    }

    static context = {
        usage: ProgramEnrolmentState.UsageKeys.Exit,
        dateAction: Actions.EXIT_DATE_TIME_CHANGED,
        dateKey: 'exitDate',
        dateField: 'programExitDateTime',
        dateValidationKey: ProgramEnrolment.validationKeys.EXIT_DATE
    };

    componentWillMount() {
        this.dispatchAction(Actions.ON_LOAD, {enrolment: this.props.params.enrolment, usage: ProgramExitView.context.usage});
        return super.componentWillMount();
    }

    viewName() {
        return "ProgramExitView";
    }

    shouldComponentUpdate(nextProps, nextState) {
        return ProgramEnrolmentState.isInitialised(nextState);
    }

    render() {
        General.logDebug(this.viewName(), 'render');
        return <ProgramFormComponent state={this.state} context={ProgramExitView.context}/>;
    }
}

export default ProgramExitView;