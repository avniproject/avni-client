import {View} from "react-native";
import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import TypedTransition from "../../framework/routing/TypedTransition";
import IndividualEncounterView from "./IndividualEncounterView";
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

@Path('/IndividualEncounterLandingView')
class IndividualEncounterLandingView extends AbstractComponent {
    static propTypes = {
        encounter: PropTypes.object,
        individualUUID: PropTypes.string
    };

    viewName() {
        return 'IndividualEncounterLandingView';
    }

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.encounter);
    }

    componentWillMount() {
        const {encounterType, individualUUID, encounter, workLists, pageNumber} = this.props;
        if (encounter) {
            this.dispatchAction(Actions.ON_ENCOUNTER_LANDING_LOAD, {encounter, workLists, pageNumber});
            return super.componentWillMount();
        }
        const encounterByType = this.context.getService(EncounterService)
            .findDueEncounter({encounterTypeName: encounterType, individualUUID})
            .cloneForEdit();
        encounterByType.encounterDateTime = moment().toDate();
        this.dispatchAction(Actions.ON_ENCOUNTER_LANDING_LOAD, {encounter: encounterByType});
        return super.componentWillMount();
    }

    shouldComponentUpdate(nextProps, state) {
        return !_.isNil(state.encounter);
    }

    next(popVerificationVew) {
        const phoneNumberObservation = _.find(this.state.encounter.observations, obs => obs.isPhoneNumberVerificationRequired(this.state.filteredFormElements));
        this.dispatchAction(Actions.NEXT, {
            validationFailed: (newState) => {
            },
            movedNext: () => {
                TypedTransition.from(this).to(IndividualEncounterView);
            },
            completed: (newState, encounterDecisions, ruleValidationErrors, checklists, nextScheduledVisits) => {
                const headerMessage = `${this.I18n.t(this.state.encounter.encounterType.displayName)} - ${this.I18n.t('summaryAndRecommendations')}`;
                const formMappingService = this.context.getService(FormMappingService);
                const form = formMappingService.findFormForEncounterType(this.state.encounter.encounterType, Form.formTypes.Encounter, this.state.encounter.individual.subjectType);
                const message = this.I18n.t('encounterSavedMsg', {encounterName:this.state.encounter.encounterType.name});
                CHSNavigator.navigateToSystemRecommendationViewFromEncounterWizard(this,
                    encounterDecisions,
                    ruleValidationErrors,
                    this.state.encounter,
                    Actions.SAVE,
                    headerMessage,
                    form,
                    newState.workListState,
                    message,
                    nextScheduledVisits,
                    popVerificationVew,
                    this.state.encounter.isRejectedEntity(),
                    this.state.encounter.latestEntityApprovalStatus,
                );
            },
            popVerificationVewFunc : () => TypedTransition.from(this).popToBookmark(),
            phoneNumberObservation,
            popVerificationVew,
            verifyPhoneNumber: (observation) => CHSNavigator.navigateToPhoneNumberVerificationView(this, this.next.bind(this), observation, () => this.dispatchAction(Actions.ON_SUCCESS_OTP_VERIFICATION, {observation}), () => this.dispatchAction(Actions.ON_SKIP_VERIFICATION, {observation, skipVerification: true})),
        });
    }

    onAppHeaderBack() {
        const onYesPress = () => CHSNavigator.navigateToFirstPage(this, [IndividualEncounterLandingView]);
        AvniAlert(this.I18n.t('backPressTitle'), this.I18n.t('backPressMessage'), onYesPress, this.I18n);
    }

    render() {
        General.logDebug(this.viewName(), `render with IndividualUUID=${this.props.individualUUID} and EncounterTypeUUID=${this.props.encounter.encounterType.uuid}`);
        return (
            <CHSContainer>
                <CHSContent>
                    <AppHeader
                        title={`${this.I18n.t(this.state.encounter.encounterType.displayName)} - ${this.I18n.t('enterData')}`}
                        func={() => this.onAppHeaderBack()} displayHomePressWarning={true}/>
                    <RejectionMessage I18n={this.I18n} entityApprovalStatus={this.state.encounter.latestEntityApprovalStatus}/>
                    <PreviousEncounterPullDownView showExpanded={this.state.previousEncountersDisplayed}
                                                   individual={this.state.encounter.individual}
                                                   actionName={Actions.TOGGLE_SHOWING_PREVIOUS_ENCOUNTER}
                                                   encounters={this.state.previousEncounters}/>
                    <View style={{
                        backgroundColor: '#ffffff',
                        paddingHorizontal: Distances.ScaledContainerHorizontalDistanceFromEdge,
                        flexDirection: 'column'
                    }}>
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
                        <FormElementGroup group={this.state.formElementGroup}
                                          observationHolder={new ObservationsHolder(this.state.encounter.observations)}
                                          actions={Actions}
                                          validationResults={this.state.validationResults}
                                          filteredFormElements={this.state.filteredFormElements}
                                          formElementsUserState={this.state.formElementsUserState}
                                          dataEntryDate={this.state.encounter.encounterDateTime}
                                          onValidationError={(x, y) => this.scrollToPosition(x, y)}
                                          subjectUUID={this.state.encounter.individual.uuid}
                        />
                        <WizardButtons next={{
                            func: () => this.next(),
                            visible: true,
                            label: this.I18n.t('next')
                        }}/>
                    </View>
                </CHSContent>
            </CHSContainer>
        );
    }
}

export default IndividualEncounterLandingView;
