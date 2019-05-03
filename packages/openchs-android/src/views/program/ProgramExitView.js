import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import ProgramFormComponent from './ProgramFormComponent';
import {Actions} from "../../action/program/ProgramEnrolmentActions";
import {ProgramEnrolment} from 'openchs-models';
import ProgramEnrolmentState from '../../action/program/ProgramEnrolmentState';
import Reducers from "../../reducer";
import General from "../../utility/General";
import CHSNavigator from "../../utility/CHSNavigator";

@Path('/ProgramExitView')
class ProgramExitView extends AbstractComponent {
    static propTypes = {
        params: PropTypes.object.isRequired
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

    onBack() {
        this.dispatchAction(Actions.ON_LOAD, {enrolment: this.props.params.enrolment, usage: ProgramExitView.context.usage});
        this.goBack();
    }

    onHardwareBackPress() {
        this.previous();
        return true;
    }

    previous() {
        this.state.wizard.isFirstPage() ? this.onBack() : this.dispatchAction(Actions.PREVIOUS);

    }


    render() {
        General.logDebug(this.viewName(), 'render');
        return <ProgramFormComponent editing={this.props.params.editing} state={this.state}
                                     context={ProgramExitView.context} backFunction={() => CHSNavigator.navigateToFirstPage(this, [ProgramExitView])}
                                     previous={() => this.previous()}/>;
    }
}

export default ProgramExitView;
