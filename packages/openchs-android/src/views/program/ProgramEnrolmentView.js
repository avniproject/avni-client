import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import ProgramFormComponent from "./ProgramFormComponent";
import {Actions} from "../../action/program/ProgramEnrolmentActions";
import {ProgramEnrolment} from "avni-models";
import ProgramEnrolmentState from "../../state/ProgramEnrolmentState";
import Reducers from "../../reducer";
import General from "../../utility/General";
import {ToastAndroid} from "react-native";
import IdentifierAssignmentService from "../../service/IdentifierAssignmentService";
import FormMappingService from "../../service/FormMappingService";
import ProgramEnrolmentService from "../../service/ProgramEnrolmentService";
import CHSNavigator from "../../utility/CHSNavigator";
import {AvniAlert} from "../common/AvniAlert";

@Path('/ProgramEnrolmentView')
class ProgramEnrolmentView extends AbstractComponent {
    static propTypes = {
        enrolment: PropTypes.object.isRequired
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
        this.state = {displayed:true};
    }

    viewName() {
        return "ProgramEnrolmentView";
    }

    static canLoad({enrolment}, parent) {
        const editing = parent.context.getService(ProgramEnrolmentService).existsByUuid(enrolment.uuid);
        if (editing) return true;
        const identifierAssignmentService = parent.context.getService(IdentifierAssignmentService);

        const form = parent.context.getService(FormMappingService).findFormForProgramEnrolment(enrolment.program, enrolment.individual.subjectType);
        if (identifierAssignmentService.haveEnoughIdentifiers(form)) {
            return true;
        }
        parent.handleError({syncRequiredError: 'NotEnoughId'});
        return false;
    }

    UNSAFE_componentWillMount() {
        this.dispatchAction(Actions.ON_LOAD, {
            enrolment: this.props.enrolment,
            usage: ProgramEnrolmentView.usageContext.usage,
            workLists: this.props.workLists,
            forceLoad: this.props.editing,
            pageNumber: this.props.pageNumber,
        });
        return super.UNSAFE_componentWillMount();
    }

    onBack() {
        this.dispatchAction(Actions.ON_LOAD, {enrolment: this.props.enrolment, usage: ProgramEnrolmentView.usageContext.usage, forceLoad: true});
        this.goBack();
    }

    onHardwareBackPress() {
        this.previous();
        return true;
    }

    previous() {
        this.state.wizard.isFirstPage() ? this.onBack() : this.dispatchAction(Actions.PREVIOUS, {cb: this.scrollToTop});

    }

    displayMessage(message) {
        if (message && this.state.displayed){
            ToastAndroid.show(message, ToastAndroid.SHORT);
            this.setState({displayed:false})
        }
    }

    onAppHeaderBack() {
        const onYesPress = () => CHSNavigator.navigateToFirstPage(this, [ProgramEnrolmentView]);
        AvniAlert(this.I18n.t('backPressTitle'), this.I18n.t('backPressMessage'), onYesPress, this.I18n);
    }

    render() {
        General.logDebug(this.viewName(), 'render');
        this.displayMessage(this.props.message);
        return <ProgramFormComponent editing={this.state.isNewEnrolment}
                                     state={this.state}
                                     context={ProgramEnrolmentView.usageContext}
                                     backFunction={() => this.onAppHeaderBack()}
                                     previous={() => this.previous()}/>;
    }
}

export default ProgramEnrolmentView;
