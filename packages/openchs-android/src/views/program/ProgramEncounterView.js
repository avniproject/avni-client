import {ScrollView, StyleSheet, ToastAndroid, Vibration, View} from "react-native";
import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import Reducers from "../../reducer";
import AppHeader from "../common/AppHeader";
import {ProgramEncounterActionsNames as Actions} from "../../action/program/ProgramEncounterActions";
import FormElementGroup from "../form/FormElementGroup";
import WizardButtons from "../common/WizardButtons";
import {AbstractEncounter, ObservationsHolder, PrimitiveValue, ProgramEncounter, Form} from 'avni-models';
import CHSNavigator from "../../utility/CHSNavigator";
import StaticFormElement from "../viewmodel/StaticFormElement";
import AbstractDataEntryState from "../../state/AbstractDataEntryState";
import DateFormElement from "../../views/form/formElement/DateFormElement";
import _ from "lodash";
import TypedTransition from "../../framework/routing/TypedTransition";
import General from "../../utility/General";
import {getCurrentPageValidationResults} from "../../utility/FormPageReadiness";
import Distances from "../primitives/Distances";
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
import EncounterSubjectHeader from "../common/EncounterSubjectHeader";
import Colors from "../primitives/Colors";
import FormMappingService from "../../service/FormMappingService";
import GeolocationFormElement from "../form/formElement/GeolocationFormElement";
import ProgramEncounterService from "../../service/program/ProgramEncounterService";
import moment from "moment";
import NewVisitPageView from "./NewVisitPageView";
import {AvniAlert} from "../common/AvniAlert";
import {RejectionMessage} from "../approval/RejectionMessage";
import SummaryButton from "../common/SummaryButton";
import BackgroundTimer from "react-native-background-timer";
import Timer from "../common/Timer";
import RuleEvaluationService from "../../service/RuleEvaluationService";
import SystemRecommendationView from "../conclusion/SystemRecommendationView";
import CustomActivityIndicator from "../CustomActivityIndicator";

@Path('/ProgramEncounterView')
class ProgramEncounterView extends AbstractComponent {
    static propTypes = {
        params: PropTypes.object.isRequired,
    };

    viewName() {
        return 'ProgramEncounterView';
    }

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.programEncounter);
        this.scrollRef = React.createRef();
    }

    UNSAFE_componentWillMount() {
        const {encounterType, enrolmentUUID, programEncounter, workLists, pageNumber, editing} = this.props.params;
        if (programEncounter) {
            this.dispatchAction(Actions.ON_LOAD, {programEncounter, workLists, pageNumber, editing});
            return super.UNSAFE_componentWillMount();
        }
        const programEncounterByType = this.context.getService(ProgramEncounterService)
            .findDueEncounter({encounterTypeName: encounterType, enrolmentUUID})
            .cloneForEdit();
        programEncounterByType.encounterDateTime = moment().toDate();
        this.dispatchAction(Actions.ON_LOAD, {programEncounter: programEncounterByType, editing});
        return super.UNSAFE_componentWillMount();
    }

    onHardwareBackPress() {
        this.onAppHeaderBack(this.state.saveDrafts);
        return true;
    }

    previous() {
        if (this.state.wizard.isFirstFormPage())
            TypedTransition.from(this).goBack();
        else
            this.dispatchAction(Actions.PREVIOUS, {cb: this.scrollToTop});
    }

    getNextParams(popVerificationVew, fromSDV) {
        const phoneNumberObservation = _.find(this.state.programEncounter.observations, obs => obs.isPhoneNumberVerificationRequired(this.state.filteredFormElements));
        return {
            completed: (state, decisions, ruleValidationErrors, checklists, nextScheduledVisits, fromSDV) => {
                const {programEncounter} = state;
                const {programEnrolment} = programEncounter;
                const encounterName = programEncounter.name || programEncounter.encounterType.displayName;

                let onPreviousCallback = undefined;
                if (fromSDV) {
                    onPreviousCallback = (context) => {
                        const form = context.getService(FormMappingService).findFormForEncounterType(programEncounter.encounterType, ProgramEncounter.schema.name, programEncounter.subjectType);
                        let pageNumber = form.numberOfPages + 1;
                        const lastGroupWithAtLeastOneVisibleElement = _.findLast(form.getFormElementGroups(),
                            (formElementGroup) => {
                                pageNumber = pageNumber - 1;
                                let formElementStatuses = context.getService(RuleEvaluationService).getFormElementsStatuses(programEncounter, ProgramEncounter.schema.name, formElementGroup);
                                let elements = formElementGroup.filterElements(formElementStatuses);
                                return !_.isEmpty(elements);
                            });

                    TypedTransition
                        .from(this)
                        .resetStack([SystemRecommendationView], [
                            TypedTransition.createRoute(ProgramEncounterView, {
                                params: {
                                    programEncounter,
                                    encounterType: encounterName,
                                    individualUUID: programEncounter.individual.uuid,
                                    enrolmentUUID: programEnrolment.uuid,
                                    editing: true,
                                    pageNumber,
                                    onSaveCallback: this.props.params.onSaveCallback,
                                    backFunction: this.props.params.backFunction,
                                    message: null
                                }}, true)]);
                    }
                }

                const onSaveCallback = this.props.params.onSaveCallback || (source => {
                    CHSNavigator.navigateToProgramEnrolmentDashboardView(source, programEnrolment.individual.uuid, programEnrolment.uuid, true,
                        this.props.params.backFunction, this.I18n.t('encounterSavedMsg', {encounterName: this.I18n.t(encounterName)}));
                });
                const headerMessage = `${this.I18n.t(programEnrolment.program.displayName)}, ${this.I18n.t(encounterName)} - ${this.I18n.t('summaryAndRecommendations')}`;
                const formMappingService = this.context.getService(FormMappingService);
                const form = formMappingService.findFormForEncounterType(this.state.programEncounter.encounterType, Form.formTypes.ProgramEncounter, this.state.programEncounter.programEnrolment.individual.subjectType);
                CHSNavigator.navigateToSystemsRecommendationView(this, decisions, ruleValidationErrors, programEnrolment.individual, programEncounter.observations, Actions.SAVE, onSaveCallback, headerMessage, checklists, nextScheduledVisits, form, state.workListState, null, state.saveDrafts, popVerificationVew, programEncounter.isRejectedEntity(), programEncounter.latestEntityApprovalStatus, onPreviousCallback, {}, programEnrolment.uuid);
            },
            popVerificationVewFunc : () => TypedTransition.from(this).popToBookmark(),
            phoneNumberObservation,
            popVerificationVew,
            verifyPhoneNumber: (observation) => CHSNavigator.navigateToPhoneNumberVerificationView(this, this.next.bind(this), observation, () => this.dispatchAction(Actions.ON_SUCCESS_OTP_VERIFICATION, {observation}), () => this.dispatchAction(Actions.ON_SKIP_VERIFICATION, {observation, skipVerification: true})),
            movedNext: this.scrollToTop,
            settleCompletion: (newState) => this.dispatchAction(Actions.USE_THIS_STATE, {state: newState}),
            fromSDV
        }
    }

    next(popVerificationVew) {
        this.dispatchAction(Actions.NEXT, this.getNextParams(popVerificationVew));
    }

    onGoToSummary(fromSDV = false) {
        this.dispatchAction(Actions.SUMMARY_PAGE, this.getNextParams(false, fromSDV))
    }

    shouldComponentUpdate(nextProps, nextState) {
        return !_.isNil(nextState.programEncounter);
    }

    displayMessage(message) {
        if (message && this.state.messageDisplayed) {
            ToastAndroid.show(message, ToastAndroid.SHORT);
            this.dispatchAction(Actions.DISPLAY_MESSAGE);
        }
    }

    onAppHeaderBack(saveDraftOn) {
        const onYesPress = () => {
            if (saveDraftOn) {
                this.dispatchAction(Actions.ON_BACK);
            }
            CHSNavigator.navigateToFirstPage(this, [ProgramEncounterView, NewVisitPageView]);
        };
        AvniAlert(this.I18n.t('backPressTitle'), this.I18n.t(saveDraftOn ? 'backPressMessageSinglePage' : 'backPressMessage'), onYesPress, this.I18n);
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
        General.logDebug('ProgramEncounterView', 'render');
        if (this.state.allElementsFilledForImmutableEncounter && !this.state.wizardCompletionInProgress) {
            this.onGoToSummary(true)
        }
        const programEncounterName = !_.isEmpty(this.state.programEncounter.name) ? this.I18n.t(this.state.programEncounter.name) : this.I18n.t(this.state.programEncounter.encounterType.operationalEncounterTypeName);
        const title = programEncounterName;
        this.displayMessage(this.props.params.message);
        const displayTimer = this.state.timerState && this.state.timerState.displayTimer(this.state.formElementGroup);
        const observationHolder = new ObservationsHolder(this.state.programEncounter.observations);
        const filteredFormElements = this.state.filteredFormElements || this.state.formElementGroup.getFormElements();
        // Mirrors the checks state.validateEntity() runs on Next-press (minus the GPS location check,
        // which needs reducer context) so the button colour reflects page completeness without
        // duplicating side-effecting validation here.
        const currentPageValidationResults = [
            ...(this.state.wizard.isFirstFormPage() ? this.state.programEncounter.validate() : []),
            ...getCurrentPageValidationResults(this.state.formElementGroup, filteredFormElements, observationHolder)
        ];
        const isCurrentPageComplete = _.every(currentPageValidationResults, validationResult => validationResult.success);
        return (
            <CHSContainer>
                <CHSContent>
                    <AppHeader title={title}
                               func={() => this.onAppHeaderBack(this.state.saveDrafts)}
                               displayHomePressWarning={!this.state.saveDrafts}/>
                    <ScrollView ref={this.scrollRef} style={{flex: 1}} keyboardShouldPersistTaps="handled">
                    {displayTimer ?
                        <Timer timerState={this.state.timerState} onStartTimer={() => this.onStartTimer()} group={this.state.formElementGroup}/> : null}
                    <RejectionMessage I18n={this.I18n} entityApprovalStatus={this.state.programEncounter.latestEntityApprovalStatus}/>
                    <View style={{flexDirection: 'column', paddingHorizontal: Distances.ScaledContentDistanceFromEdge}}>
                        {this.state.wizard.isFirstFormPage() ?
                            <View>
                                <View style={{
                                    backgroundColor: '#ffffff',
                                    borderRadius: 12,
                                    marginBottom: Distances.VerticalSpacingBetweenFormElements,
                                    overflow: 'hidden'
                                }}>
                                    <EncounterSubjectHeader individual={this.state.programEncounter.programEnrolment.individual}/>
                                </View>
                                <SummaryButton onPress={() => this.onGoToSummary()}/>
                                <GeolocationFormElement
                                    location={this.state.programEncounter.encounterLocation}
                                    editing={this.props.params.editing}
                                    actionName={Actions.SET_ENCOUNTER_LOCATION}
                                    errorActionName={Actions.SET_LOCATION_ERROR}
                                    validationResult={AbstractDataEntryState.getValidationError(this.state, ProgramEncounter.validationKeys.ENCOUNTER_LOCATION)}
                                />
                                <DateFormElement actionName={Actions.ENCOUNTER_DATE_TIME_CHANGED}
                                                 element={Object.assign(new StaticFormElement('encounterDate'), {styles: {color: Colors.BrandPrimary}})}
                                                 dateValue={new PrimitiveValue(this.state.programEncounter.encounterDateTime)}
                                                 validationResult={AbstractDataEntryState.getValidationError(this.state, AbstractEncounter.fieldKeys.ENCOUNTER_DATE_TIME)}
                                                 style={{paddingTop: 0}}/>
                            </View>
                            :
                            <View/>
                        }
                        {!this.state.wizard.isFirstFormPage() &&
                        <SummaryButton onPress={() => this.onGoToSummary()}/>}
                    </View>
                    <View style={{backgroundColor: '#ffffff', flexDirection: 'column'}}>
                        {_.get(this.state, 'timerState.displayQuestions', true) &&
                            <FormElementGroup
                            observationHolder={observationHolder}
                            group={this.state.formElementGroup}
                            actions={Actions}
                            validationResults={this.state.validationResults}
                            filteredFormElements={this.state.filteredFormElements}
                            formElementsUserState={this.state.formElementsUserState}
                            dataEntryDate={this.state.programEncounter.encounterDateTime}
                            onValidationError={(x, y) => this.scrollToPosition(x, y)}
                            subjectUUID={this.state.programEncounter.programEnrolment.individual.uuid}
                        />}
                    </View>
                    </ScrollView>
                    {!displayTimer &&
                    <View style={styles.fixedButtonBar}>
                        <WizardButtons
                            containerStyle={{paddingHorizontal: Distances.ScaledContentDistanceFromEdge}}
                            buttonHeight={56}
                            previous={{
                                func: () => this.previous(),
                                visible: !this.state.wizard.isFirstPage(),
                                label: this.I18n.t('previous')
                            }}
                            next={{
                                func: () => this.next(),
                                label: this.I18n.t('next'),
                                ready: isCurrentPageComplete
                            }}
                        />
                    </View>}
                </CHSContent>
                <CustomActivityIndicator loading={!!this.state.wizardCompletionInProgress}/>
            </CHSContainer>
        );
    }
}

const styles = StyleSheet.create({
    fixedButtonBar: {
        height: 84,
        justifyContent: 'center',
        backgroundColor: '#ffffff',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: -3},
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 8
    }
});

export default ProgramEncounterView;
