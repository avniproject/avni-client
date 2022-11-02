import {StyleSheet, View, Vibration, ScrollView} from "react-native";
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
import {ObservationsHolder, ValidationResult, AbstractEncounter, PrimitiveValue, Encounter, Form} from 'avni-models';
import CHSNavigator from "../../utility/CHSNavigator";
import PreviousEncounterPullDownView from "./PreviousEncounterPullDownView";
import StaticFormElement from "../viewmodel/StaticFormElement";
import DateFormElement from "../form/formElement/DateFormElement";
import Distances from "../primitives/Distances";
import CHSContent from "../common/CHSContent";
import CHSContainer from "../common/CHSContainer";
import FormMappingService from "../../service/FormMappingService";
import GeolocationFormElement from "../form/formElement/GeolocationFormElement";
import AbstractDataEntryState from "../../state/AbstractDataEntryState";
import EncounterService from "../../service/EncounterService";
import {AvniAlert} from "../common/AvniAlert";
import {RejectionMessage} from "../approval/RejectionMessage";
import SummaryButton from "../common/SummaryButton";
import Timer from "../common/Timer";
import BackgroundTimer from "react-native-background-timer";

@Path('/IndividualEncounterView')
class IndividualEncounterView extends AbstractComponent {
    static propTypes = {
        encounter: PropTypes.object,
        individualUUID: PropTypes.string
    };

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.encounter);
        this.scrollRef = React.createRef();
    }

    viewName() {
        return 'IndividualEncounterView';
    }

    componentWillMount() {
        const {encounterType, individualUUID, encounter, workLists, pageNumber, editing} = this.props;
        if (encounter) {
            this.dispatchAction(Actions.ON_ENCOUNTER_LANDING_LOAD, {encounter, workLists, pageNumber, editing});
            return super.componentWillMount();
        }
        const encounterByType = this.context.getService(EncounterService)
            .findDueEncounter({encounterTypeName: encounterType, individualUUID})
            .cloneForEdit();
        encounterByType.encounterDateTime = moment().toDate();
        this.dispatchAction(Actions.ON_ENCOUNTER_LANDING_LOAD, {encounter: encounterByType, editing});
        return super.componentWillMount();
    }

    didFocus() {
        super.didFocus();
        this.dispatchAction(Actions.ON_FOCUS);
    }

    shouldComponentUpdate(nextProps, state) {
        return !_.isNil(state.encounter);
    }

    getNextParams(popVerificationVew) {
        const phoneNumberObservation = _.find(this.state.encounter.observations, obs => obs.isPhoneNumberVerificationRequired(this.state.filteredFormElements));
        return {
            completed: (newState, encounterDecisions, ruleValidationErrors, checklists, nextScheduledVisits) => {
                const headerMessage = `${this.I18n.t(this.state.encounter.encounterType.displayName)} - ${this.I18n.t('summaryAndRecommendations')}`;
                const formMappingService = this.context.getService(FormMappingService);
                const form = formMappingService.findFormForEncounterType(this.state.encounter.encounterType, Form.formTypes.Encounter, this.state.encounter.individual.subjectType);
                const message = this.I18n.t('encounterSavedMsg', {encounterName: this.state.encounter.encounterType.name});
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
                    this.state.encounter.latestEntityApprovalStatus
                );
            },
            popVerificationVewFunc: () => TypedTransition.from(this).popToBookmark(),
            phoneNumberObservation,
            popVerificationVew,
            verifyPhoneNumber: (observation) => CHSNavigator.navigateToPhoneNumberVerificationView(this, this.next.bind(this), observation, () => this.dispatchAction(Actions.ON_SUCCESS_OTP_VERIFICATION, {observation}), () => this.dispatchAction(Actions.ON_SKIP_VERIFICATION, {
                observation,
                skipVerification: true
            })),
            movedNext: this.scrollToTop
        }
    }

    next(popVerificationVew) {
        this.dispatchAction(Actions.NEXT, this.getNextParams(popVerificationVew));
    }

    onGoToSummary() {
        const params = this.getNextParams(false);
        this.dispatchAction(Actions.SUMMARY_PAGE, params)
    }

    onHardwareBackPress() {
        this.previous();
        return true;
    }

    previous() {
        this.state.wizard.isFirstPage() ? this.goBack() : this.dispatchAction(Actions.PREVIOUS, {cb: this.scrollToTop});
    }

    onAppHeaderBack() {
        const onYesPress = () => CHSNavigator.navigateToFirstPage(this, [IndividualEncounterView]);
        AvniAlert(this.I18n.t('backPressTitle'), this.I18n.t('backPressMessage'), onYesPress, this.I18n);
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
        const title = `${this.I18n.t(this.state.encounter.encounterType.displayName)} - ${this.I18n.t('enterData')}`;
        return (
            <CHSContainer>
                <CHSContent >
                    <ScrollView ref={this.scrollRef}>
                    <AppHeader title={title} func={() => this.onAppHeaderBack()} displayHomePressWarning={true}/>
                    {displayTimer ?
                        <Timer timerState={this.state.timerState} onStartTimer={() => this.onStartTimer()} group={this.state.formElementGroup}/> : null}
                    {this.state.wizard.isFirstFormPage() ?
                        <View>
                            <RejectionMessage I18n={this.I18n}
                                              entityApprovalStatus={this.state.encounter.latestEntityApprovalStatus}/>
                            {this.state.loadPullDownView &&
                            <PreviousEncounterPullDownView showExpanded={this.state.previousEncountersDisplayed}
                                                           individual={this.state.encounter.individual}
                                                           actionName={Actions.TOGGLE_SHOWING_PREVIOUS_ENCOUNTER}
                                                           encounters={this.state.previousEncounters}/>}
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
                                                 element={new StaticFormElement(AbstractEncounter.fieldKeys.ENCOUNTER_DATE_TIME)}
                                                 dateValue={new PrimitiveValue(this.state.encounter.encounterDateTime)}
                                                 validationResult={ValidationResult.findByFormIdentifier(this.state.validationResults, AbstractEncounter.fieldKeys.ENCOUNTER_DATE_TIME)}/>
                            </View>
                        </View> : <View/>}
                    <View style={styles.container}>
                        {!this.state.wizard.isFirstFormPage() &&
                        <SummaryButton onPress={() => this.onGoToSummary()}/>}
                    </View>
                    <View style={{backgroundColor: '#ffffff', flexDirection: 'column'}}>
                        {_.get(this.state, 'timerState.displayQuestions', true) &&
                        <FormElementGroup group={this.state.formElementGroup}
                                          observationHolder={new ObservationsHolder(this.state.encounter.observations)}
                                          actions={Actions}
                                          validationResults={this.state.validationResults}
                                          filteredFormElements={this.state.filteredFormElements}
                                          formElementsUserState={this.state.formElementsUserState}
                                          dataEntryDate={this.state.encounter.encounterDateTime}
                                          onValidationError={(x, y) => this.scrollToPosition(x, y)}
                                          subjectUUID={this.state.encounter.individual.uuid}
                        />}
                        {!displayTimer &&
                        <WizardButtons
                            previous={{
                                visible: !this.state.wizard.isFirstPage(),
                                func: () => this.previous(),
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
            </CHSContainer>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#ffffff',
        paddingHorizontal: Distances.ScaledContainerHorizontalDistanceFromEdge,
        flexDirection: 'column'
    }
});

export default IndividualEncounterView;
