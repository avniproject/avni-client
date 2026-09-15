import {ScrollView, StyleSheet, Vibration, View} from "react-native";
import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import TypedTransition from "../../framework/routing/TypedTransition";
import FormElementGroup from "../form/FormElementGroup";
import AppHeader from "../common/AppHeader";
import WizardButtons from "../common/WizardButtons";
import Reducers from "../../reducer";
import {IndividualEncounterViewActions as Actions} from "../../action/individual/EncounterActions";
import _ from "lodash";
import General from "../../utility/General";
import {getCurrentPageValidationResults} from "../../utility/FormPageReadiness";
import {AbstractEncounter, Encounter, Form, ObservationsHolder, PrimitiveValue, ValidationResult} from 'openchs-models';
import CHSNavigator from "../../utility/CHSNavigator";
import StaticFormElement from "../viewmodel/StaticFormElement";
import DateFormElement from "../form/formElement/DateFormElement";
import Distances from "../primitives/Distances";
import CHSContent from "../common/CHSContent";
import CHSContainer from "../common/CHSContainer";
import EncounterSubjectHeader from "../common/EncounterSubjectHeader";
import Colors from "../primitives/Colors";
import CustomActivityIndicator from "../CustomActivityIndicator";
import FormMappingService from "../../service/FormMappingService";
import GeolocationFormElement from "../form/formElement/GeolocationFormElement";
import AbstractDataEntryState from "../../state/AbstractDataEntryState";
import EncounterService from "../../service/EncounterService";
import {AvniAlert} from "../common/AvniAlert";
import {RejectionMessage} from "../approval/RejectionMessage";
import SummaryButton from "../common/SummaryButton";
import Timer from "../common/Timer";
import BackgroundTimer from "react-native-background-timer";
import {Actions as IGHActions} from "../../action/individual/IndividualGeneralHistoryActions";
import PreviousEncounters from "../common/PreviousEncounters";

@Path('/IndividualEncounterView')
class IndividualEncounterView extends AbstractComponent {
    static propTypes = {
        encounter: PropTypes.object,
        individualUUID: PropTypes.string,
        onSaveCallback: PropTypes.func
    };

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.encounter);
        this.scrollRef = React.createRef();
    }

    viewName() {
        return 'IndividualEncounterView';
    }

    UNSAFE_componentWillMount() {
        const {encounterType, individualUUID, encounter, workLists, pageNumber, editing} = this.props;
        if (encounter) {
            this.dispatchAction(Actions.ON_ENCOUNTER_LANDING_LOAD, {encounter, workLists, pageNumber, editing});
            return super.UNSAFE_componentWillMount();
        }
        const encounterByType = this.context.getService(EncounterService)
            .findDueEncounter({encounterTypeName: encounterType, individualUUID})
            .cloneForEdit();
        encounterByType.encounterDateTime = moment().toDate();
        this.dispatchAction(Actions.ON_ENCOUNTER_LANDING_LOAD, {encounter: encounterByType, editing});
        return super.UNSAFE_componentWillMount();
    }

    didFocus() {
        super.didFocus();
        this.dispatchAction(Actions.ON_FOCUS);
    }

    shouldComponentUpdate(nextProps, state) {
        return !_.isNil(state.encounter);
    }

    getNextParams(popVerificationVew, fromSDV) {
        const phoneNumberObservation = _.find(this.state.encounter.observations, obs => obs.isPhoneNumberVerificationRequired(this.state.filteredFormElements));
        return {
            completed: (newState, encounterDecisions, ruleValidationErrors, checklists, nextScheduledVisits, fromSDV) => {
                const headerMessage = `${this.I18n.t(this.state.encounter.encounterType.displayName)} - ${this.I18n.t('summaryAndRecommendations')}`;
                const formMappingService = this.context.getService(FormMappingService);
                const form = formMappingService.findFormForEncounterType(this.state.encounter.encounterType, Form.formTypes.Encounter, this.state.encounter.individual.subjectType);
                const message = this.I18n.t('encounterSavedMsg', {encounterName: this.I18n.t(this.state.encounter.encounterType.displayName)});
                CHSNavigator.navigateToSystemRecommendationViewFromEncounterWizard(this,
                    encounterDecisions,
                    ruleValidationErrors,
                    newState.encounter,
                    Actions.SAVE,
                    headerMessage,
                    form,
                    newState.workListState,
                    message,
                    nextScheduledVisits,
                    popVerificationVew,
                    this.state.encounter.isRejectedEntity(),
                    this.state.encounter.latestEntityApprovalStatus,
                    fromSDV,
                    newState.saveDrafts,
                    this.props.onSaveCallback
                );
            },
            popVerificationVewFunc: () => TypedTransition.from(this).popToBookmark(),
            phoneNumberObservation,
            popVerificationVew,
            verifyPhoneNumber: (observation) => CHSNavigator.navigateToPhoneNumberVerificationView(this, this.next.bind(this), observation, () => this.dispatchAction(Actions.ON_SUCCESS_OTP_VERIFICATION, {observation}), () => this.dispatchAction(Actions.ON_SKIP_VERIFICATION, {
                observation,
                skipVerification: true
            })),
            movedNext: this.scrollToTop,
            settleCompletion: (newState) => this.dispatchAction(Actions.USE_THIS_STATE, {state: newState}),
            fromSDV
        }
    }

    next(popVerificationVew) {
        this.dispatchAction(Actions.NEXT, this.getNextParams(popVerificationVew));
    }

    onGoToSummary(fromSDV = false) {
        const params = this.getNextParams(false, fromSDV);
        this.dispatchAction(Actions.SUMMARY_PAGE, params)
    }

    onHardwareBackPress() {
        this.onAppHeaderBack(this.state.saveDrafts);
        return true;
    }

    previous() {
        this.state.wizard.isFirstPage() ? this.goBack() : this.dispatchAction(Actions.PREVIOUS, {cb: this.scrollToTop});
    }

    onAppHeaderBack(saveDraftOn) {
        const onYesPress = () => {
            this.dispatchAction(IGHActions.ON_RENDER, {
                individualUUID: this.props.individualUUID || this.props.encounter.individual.uuid
            });
            CHSNavigator.navigateToFirstPage(this, [IndividualEncounterView]);
        }
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
        const displayTimer = this.state.timerState && this.state.timerState.displayTimer(this.state.formElementGroup);
        General.logDebug(this.viewName(), `render with IndividualUUID=${this.props.individualUUID} and EncounterTypeUUID=${this.props.encounter.encounterType.uuid}`);
        if (this.state.allElementsFilledForImmutableEncounter && !this.state.wizardCompletionInProgress) {
            this.onGoToSummary(true);
        }
        const title = this.I18n.t(this.state.encounter.encounterType.displayName);
        const observationHolder = new ObservationsHolder(this.state.encounter.observations);
        const filteredFormElements = this.state.filteredFormElements || this.state.formElementGroup.getFormElements();
        // Mirrors the checks state.validateEntity() runs on Next-press (minus the GPS location check,
        // which needs reducer context) so the button colour reflects page completeness without
        // duplicating side-effecting validation here.
        const currentPageValidationResults = [
            ...(this.state.wizard.isFirstFormPage() ? this.state.encounter.validate() : []),
            ...getCurrentPageValidationResults(this.state.formElementGroup, filteredFormElements, observationHolder)
        ];
        const isCurrentPageComplete = _.every(currentPageValidationResults, validationResult => validationResult.success);
        return (
            <CHSContainer>
                <CHSContent>
                    <AppHeader title={title} func={() => this.onAppHeaderBack(this.state.saveDrafts)} displayHomePressWarning={!this.state.saveDrafts}/>
                    <ScrollView ref={this.scrollRef} style={{flex: 1}} keyboardShouldPersistTaps="handled">
                    {displayTimer ?
                        <Timer timerState={this.state.timerState} onStartTimer={() => this.onStartTimer()} group={this.state.formElementGroup}/> : null}
                    {this.state.wizard.isFirstFormPage() ?
                        <View>
                            <RejectionMessage I18n={this.I18n}
                                              entityApprovalStatus={this.state.encounter.latestEntityApprovalStatus}/>
                            <View style={{
                                backgroundColor: '#ffffff',
                                borderRadius: 12,
                                marginHorizontal: Distances.ScaledContainerHorizontalDistanceFromEdge,
                                marginBottom: Distances.VerticalSpacingBetweenFormElements,
                                overflow: 'hidden'
                            }}>
                                <EncounterSubjectHeader individual={this.state.encounter.individual}
                                                         expanded={this.state.previousEncountersDisplayed}
                                                         onToggleExpand={() => this.dispatchAction(Actions.TOGGLE_SHOWING_PREVIOUS_ENCOUNTER)}/>
                                {this.state.loadPullDownView && this.state.previousEncountersDisplayed &&
                                <PreviousEncounters encounters={this.state.previousEncounters}
                                                     formType={Form.formTypes.Encounter}
                                                     style={{paddingHorizontal: Distances.ScaledContentDistanceFromEdge}}
                                                     showPartial={false}/>}
                            </View>
                            <View style={styles.container}>
                                <SummaryButton onPress={() => this.onGoToSummary()}/>
                                <GeolocationFormElement
                                    location={this.state.encounter.encounterLocation}
                                    editing={this.props.editing}
                                    actionName={Actions.SET_ENCOUNTER_LOCATION}
                                    errorActionName={Actions.SET_LOCATION_ERROR}
                                    validationResult={AbstractDataEntryState.getValidationError(this.state, Encounter.validationKeys.ENCOUNTER_LOCATION)}
                                />
                                <DateFormElement actionName={Actions.ENCOUNTER_DATE_TIME_CHANGE}
                                                 element={Object.assign(new StaticFormElement(AbstractEncounter.fieldKeys.ENCOUNTER_DATE_TIME), {styles: {color: Colors.BrandPrimary}})}
                                                 dateValue={new PrimitiveValue(this.state.encounter.encounterDateTime)}
                                                 validationResult={ValidationResult.findByFormIdentifier(this.state.validationResults, AbstractEncounter.fieldKeys.ENCOUNTER_DATE_TIME)}
                                                 style={{paddingTop: 0}}/>
                            </View>
                        </View> : <View/>}
                    <View style={styles.container}>
                        {!this.state.wizard.isFirstFormPage() &&
                        <SummaryButton onPress={() => this.onGoToSummary()}/>}
                    </View>
                    <View style={{backgroundColor: '#ffffff', flexDirection: 'column'}}>
                        {_.get(this.state, 'timerState.displayQuestions', true) &&
                        <FormElementGroup group={this.state.formElementGroup}
                                          observationHolder={observationHolder}
                                          actions={Actions}
                                          validationResults={this.state.validationResults}
                                          filteredFormElements={this.state.filteredFormElements}
                                          formElementsUserState={this.state.formElementsUserState}
                                          dataEntryDate={this.state.encounter.encounterDateTime}
                                          onValidationError={(x, y) => this.scrollToPosition(x, y)}
                                          subjectUUID={this.state.encounter.individual.uuid}
                        />}
                    </View>
                    </ScrollView>
                    {!displayTimer &&
                    <View style={styles.fixedButtonBar}>
                        <WizardButtons
                            containerStyle={{paddingHorizontal: Distances.ScaledContentDistanceFromEdge}}
                            buttonHeight={56}
                            previous={{
                                visible: !this.state.wizard.isFirstPage(),
                                func: () => this.previous(),
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
    container: {
        backgroundColor: '#ffffff',
        paddingHorizontal: Distances.ScaledContainerHorizontalDistanceFromEdge,
        flexDirection: 'column'
    },
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

export default IndividualEncounterView;
