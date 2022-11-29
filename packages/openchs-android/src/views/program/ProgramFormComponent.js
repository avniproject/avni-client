import {ScrollView, StyleSheet, Vibration, View} from "react-native";
import PropTypes from 'prop-types';
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import AppHeader from "../common/AppHeader";
import IndividualProfile from "../common/IndividualProfile";
import themes from "../primitives/themes";
import {Actions} from "../../action/program/ProgramEnrolmentActions";
import StaticFormElement from "../viewmodel/StaticFormElement";
import DateFormElement from "../form/formElement/DateFormElement";
import FormElementGroup from "../form/FormElementGroup";
import WizardButtons from "../common/WizardButtons";
import {PrimitiveValue, ProgramEnrolment} from 'avni-models';
import AbstractDataEntryState from "../../state/AbstractDataEntryState";
import CHSNavigator from "../../utility/CHSNavigator";
import ProgramEnrolmentState from '../../state/ProgramEnrolmentState';
import Distances from "../primitives/Distances";
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
import FormMappingService from "../../service/FormMappingService";
import GeolocationFormElement from "../form/formElement/GeolocationFormElement";
import _ from "lodash";
import TypedTransition from "../../framework/routing/TypedTransition";
import {RejectionMessage} from "../approval/RejectionMessage";
import SummaryButton from "../common/SummaryButton";
import BackgroundTimer from "react-native-background-timer";
import Timer from "../common/Timer";
import Colors from "../primitives/Colors";

class ProgramFormComponent extends AbstractComponent {
    static propTypes = {
        context: PropTypes.object.isRequired,
        state: PropTypes.object.isRequired,
        backFunction: PropTypes.func.isRequired,
        editing: PropTypes.bool.isRequired
    };

    constructor(props, context) {
        super(props, context);
        this.scrollRef = React.createRef();
    }

    getNextParams(popVerificationVew) {
        const observations = this.props.context.usage === ProgramEnrolmentState.UsageKeys.Enrol ? this.props.state.enrolment.observations : this.props.state.enrolment.programExitObservations;
        const phoneNumberObservation = _.find(observations, obs => obs.isPhoneNumberVerificationRequired(this.props.state.filteredFormElements));
        return {
            completed: (state, decisions, ruleValidationErrors, checklists, nextScheduledVisits) => {
                const observations = this.props.context.usage === ProgramEnrolmentState.UsageKeys.Enrol ? state.enrolment.observations : state.enrolment.programExitObservations;
                const message = observations === state.enrolment.observations ? this.I18n.t('enrolmentSavedMsg', {programName: state.enrolment.program.name}) : this.I18n.t('enrolmentExitMsg', {programName: state.enrolment.program.name});
                const onSaveCallback = (source) => {
                    CHSNavigator.navigateToProgramEnrolmentDashboardView(source, state.enrolment.individual.uuid, state.enrolment.uuid, true,null, message);
                };
                const headerMessage = `${this.I18n.t(state.enrolment.program.displayName)}, ${this.I18n.t(ProgramEnrolmentState.UsageKeys.Enrol ? 'enrol' : 'exit')} - ${this.I18n.t('summaryAndRecommendations')}`;
                const formMappingService = this.context.getService(FormMappingService);
                const form = formMappingService.findFormForProgramEnrolment(state.enrolment.program, state.enrolment.individual.subjectType);
                CHSNavigator.navigateToSystemsRecommendationView(this, decisions, ruleValidationErrors, state.enrolment.individual, observations, Actions.SAVE, onSaveCallback, headerMessage, checklists, nextScheduledVisits, form, state.workListState, null, false, popVerificationVew, state.enrolment.isRejectedEntity(), state.enrolment.latestEntityApprovalStatus);
            },
                popVerificationVewFunc : () => TypedTransition.from(this).popToBookmark(),
            phoneNumberObservation,
            popVerificationVew,
            verifyPhoneNumber: (observation) => CHSNavigator.navigateToPhoneNumberVerificationView(this, this.next.bind(this), observation, () => this.dispatchAction(Actions.ON_SUCCESS_OTP_VERIFICATION, {observation}), () => this.dispatchAction(Actions.ON_SKIP_VERIFICATION, {observation, skipVerification: true})),
            movedNext: this.scrollToTop
        }
    }

    next(popVerificationVew) {
        this.dispatchAction(Actions.NEXT, this.getNextParams(popVerificationVew));
    }

    onGoToSummary() {
        this.dispatchAction(Actions.SUMMARY_PAGE, this.getNextParams(false))
    }

    onStartTimer() {
        this.dispatchAction(Actions.ON_START_TIMER,
            {
                cb: () => BackgroundTimer.runBackgroundTimer(
                    () => this.dispatchAction(Actions.ON_TIMED_FORM,
                        {
                            vibrate: (pattern) => Vibration.vibrate(pattern),
                            nextParams: this.getNextParams(false),
                            //https://github.com/ocetnik/react-native-background-timer/issues/310#issuecomment-1169621884
                            stopTimer: () => setTimeout(() => BackgroundTimer.stopBackgroundTimer(), 0)
                        }),
                    1000
                )
            })
    }

    render() {
        const enrol = this.props.context.usage === ProgramEnrolmentState.UsageKeys.Enrol;
        const validationKey = enrol
            ? ProgramEnrolment.validationKeys.ENROLMENT_LOCATION
            : ProgramEnrolment.validationKeys.EXIT_LOCATION
        const displayTimer = this.props.state.timerState && this.props.state.timerState.displayTimer(this.props.state.formElementGroup);
        return (<CHSContainer>
            <CHSContent>
                <ScrollView ref={this.scrollRef} keyboardShouldPersistTaps="handled">
                <AppHeader
                    title={this.I18n.t('enrolInSpecificProgram', {program: this.I18n.t(this.props.state.enrolment.program.displayName)})}
                    func={this.props.backFunction} displayHomePressWarning={true}/>
                {this.props.state.wizard.isFirstFormPage() &&
                <IndividualProfile textColor={Colors.TextOnPrimaryColor}
                    viewContext={IndividualProfile.viewContext.Wizard}
                                   individual={this.props.state.enrolment.individual}/>}
                {displayTimer ?
                    <Timer timerState={this.props.state.timerState} onStartTimer={() => this.onStartTimer()} group={this.props.state.formElementGroup}/> : null}
                    {this.props.state.wizard.isFirstFormPage() ?
                    <View>
                        <RejectionMessage I18n={this.I18n} entityApprovalStatus={this.props.state.enrolment.latestEntityApprovalStatus}/>
                        <SummaryButton onPress={() => this.onGoToSummary()} styles={{marginRight: Distances.ScaledContentDistanceFromEdge}}/>
                        <GeolocationFormElement
                            location={enrol ? this.props.state.enrolment.enrolmentLocation : this.props.state.enrolment.exitLocation}
                            editing={this.props.editing}
                            actionName={enrol ? Actions.SET_ENROLMENT_LOCATION : Actions.SET_EXIT_LOCATION}
                            errorActionName={Actions.SET_LOCATION_ERROR}
                            validationResult={AbstractDataEntryState.getValidationError(this.props.state, validationKey)}
                            style={{marginHorizontal: Distances.ContentDistanceFromEdge}}
                        />
                        <DateFormElement actionName={this.props.context.dateAction}
                                         element={new StaticFormElement(this.props.context.dateKey)}
                                         dateValue={new PrimitiveValue(this.props.state.enrolment[this.props.context.dateField])}
                                         validationResult={AbstractDataEntryState.getValidationError(this.props.state, this.props.context.dateValidationKey)}
                                         style={{marginHorizontal: Distances.ContentDistanceFromEdge}}/>
                    </View>
                    :
                    <View/>}
                <View style={{paddingHorizontal: Distances.ScaledContentDistanceFromEdge, flexDirection: 'column'}}>
                    {!this.props.state.wizard.isFirstFormPage() &&
                    <SummaryButton onPress={() => this.onGoToSummary()}/>}
                </View>
                <View style={{backgroundColor: '#ffffff', flexDirection: 'column'}}>
                    {_.get(this.props.state, 'timerState.displayQuestions', true) &&
                        <FormElementGroup actions={Actions} group={this.props.state.formElementGroup}
                                      observationHolder={this.props.state.applicableObservationsHolder}
                                      validationResults={this.props.state.validationResults}
                                      formElementsUserState={this.props.state.formElementsUserState}
                                      filteredFormElements={this.props.state.filteredFormElements}
                                      dataEntryDate={this.props.state.enrolment.enrolmentDateTime}
                                      onValidationError={(x, y) => this.scrollToPosition(x, y)}
                                      groupAffiliation={this.props.state.groupAffiliation}
                                      subjectUUID={this.props.state.enrolment.individual.uuid}
                    />}
                    {!displayTimer &&
                    <WizardButtons
                        previous={{
                            visible: !this.props.state.wizard.isFirstPage(),
                            func: () => this.props.previous(),
                            label: this.I18n.t('previous')
                        }}
                        next={{
                            func: () => this.next(),
                            label: this.I18n.t('next')
                        }}
                    />}
                </View>
                </ScrollView>
            </CHSContent>
        </CHSContainer>);
    }
}

export default ProgramFormComponent;
