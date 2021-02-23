import {StyleSheet, View} from "react-native";
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

class ProgramFormComponent extends AbstractComponent {
    static propTypes = {
        context: PropTypes.object.isRequired,
        state: PropTypes.object.isRequired,
        backFunction: PropTypes.func.isRequired,
        editing: PropTypes.bool.isRequired
    };

    next(popVerificationVew) {
        const observations = this.props.context.usage === ProgramEnrolmentState.UsageKeys.Enrol ? this.props.state.enrolment.observations : this.props.state.enrolment.programExitObservations;
        const phoneNumberObservation = _.find(observations, obs => obs.isPhoneNumberVerificationRequired(this.props.state.filteredFormElements));
        this.dispatchAction(Actions.NEXT, {
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
            verifyPhoneNumber: (observation) => CHSNavigator.navigateToPhoneNumberVerificationView(this, this.next.bind(this), observation, () => this.dispatchAction(Actions.ON_SUCCESS_OTP_VERIFICATION, {observation})),
            movedNext: this.scrollToTop
        });
    }

    render() {
        const enrol = this.props.context.usage === ProgramEnrolmentState.UsageKeys.Enrol;
        const validationKey = enrol
            ? ProgramEnrolment.validationKeys.ENROLMENT_LOCATION
            : ProgramEnrolment.validationKeys.EXIT_LOCATION

        return (<CHSContainer>
            <CHSContent ref="scroll">
                <AppHeader
                    title={this.I18n.t('enrolInSpecificProgram', {program: this.I18n.t(this.props.state.enrolment.program.displayName)})}
                    func={this.props.backFunction} displayHomePressWarning={true}/>
                {this.props.state.wizard.isFirstFormPage() ?
                    <View>
                        <IndividualProfile viewContext={IndividualProfile.viewContext.Wizard}
                                           individual={this.props.state.enrolment.individual}/>
                        <RejectionMessage I18n={this.I18n} entityApprovalStatus={this.props.state.enrolment.latestEntityApprovalStatus}/>
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
                    <FormElementGroup actions={Actions} group={this.props.state.formElementGroup}
                                      observationHolder={this.props.state.applicableObservationsHolder}
                                      validationResults={this.props.state.validationResults}
                                      formElementsUserState={this.props.state.formElementsUserState}
                                      filteredFormElements={this.props.state.filteredFormElements}
                                      dataEntryDate={this.props.state.enrolment.enrolmentDateTime}
                                      onValidationError={(x, y) => this.scrollToPosition(x, y)}/>
                    <WizardButtons previous={{
                        visible: !this.props.state.wizard.isFirstPage(),
                        func: () => this.props.previous(),
                        label: this.I18n.t('previous')
                    }}
                                   next={{func: () => this.next(), label: this.I18n.t('next')}}/>
                </View>
            </CHSContent>
        </CHSContainer>);
    }
}

export default ProgramFormComponent;
