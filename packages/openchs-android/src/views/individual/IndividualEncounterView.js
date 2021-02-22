import AbstractComponent from "../../framework/view/AbstractComponent";
import React from "react";
import {View} from "react-native";
import Path from "../../framework/routing/Path";
import TypedTransition from "../../framework/routing/TypedTransition";
import FormElementGroup from "../form/FormElementGroup";
import {IndividualEncounterViewActions as Actions} from "../../action/individual/EncounterActions";
import Reducers from "../../reducer";
import AppHeader from "../common/AppHeader";
import WizardButtons from "../common/WizardButtons";
import {Form, ObservationsHolder} from 'avni-models';
import CHSNavigator from "../../utility/CHSNavigator";
import DGS from '../primitives/DynamicGlobalStyles';
import PreviousEncounterPullDownView from "./PreviousEncounterPullDownView";
import General from "../../utility/General";
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
import FormMappingService from "../../service/FormMappingService";
import {AvniAlert} from "../common/AvniAlert";
import IndividualEncounterLandingView from "./IndividualEncounterLandingView";
import _ from "lodash";

@Path('/IndividualEncounterView')
class IndividualEncounterView extends AbstractComponent {
    viewName() {
        return 'IndividualEncounterView';
    }

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.encounter);
    }

    componentWillMount() {
        this.dispatchAction(Actions.ON_LOAD);
        return super.componentWillMount();
    }

    shouldComponentUpdate(nextProps, nextState) {
        return !nextState.wizard.isFirstPage();
    }

    next(popVerificationVew) {
        const phoneNumberObservation = _.find(this.state.encounter.observations, obs => obs.isPhoneNumberVerificationRequired(this.state.filteredFormElements));
        this.dispatchAction(Actions.NEXT, {
            completed: (newState, encounterDecisions, ruleValidationErrors, checklists, nextScheduledVisits) => {
                const headerMessage = `${this.I18n.t(newState.encounter.encounterType.displayName)} - ${this.I18n.t('summaryAndRecommendations')}`;
                const formMappingService = this.context.getService(FormMappingService);
                const form = formMappingService.findFormForEncounterType(newState.encounter.encounterType, Form.formTypes.Encounter, newState.encounter.individual.subjectType);
                const message = this.I18n.t('encounterSavedMsg', {encounterName: newState.encounter.encounterType.displayName});
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
                    newState.encounter.isRejectedEntity()
                );
            },
            popVerificationVewFunc : () => TypedTransition.from(this).popToBookmark(),
            phoneNumberObservation,
            popVerificationVew,
            verifyPhoneNumber: (observation) => CHSNavigator.navigateToPhoneNumberVerificationView(this, this.next.bind(this), observation, () => this.dispatchAction(Actions.ON_SUCCESS_OTP_VERIFICATION, {observation})),
            movedNext: this.scrollToTop,
            validationFailed: (newState) => {
            },
        });
    }

    onHardwareBackPress() {
        !this.state.wizard.isFirstPage() ? this.previous() : TypedTransition.from(this).goBack();
        return true;
    }

    previous() {
        this.dispatchAction(Actions.PREVIOUS, {
            cb: (newState) => {
                if (newState.wizard.isFirstPage())
                    TypedTransition.from(this).goBack();
            }
        });
    }

    onAppHeaderBack() {
        const onYesPress = () => CHSNavigator.navigateToFirstPage(this, [IndividualEncounterView, IndividualEncounterLandingView]);
        AvniAlert(this.I18n.t('backPressTitle'), this.I18n.t('backPressMessage'), onYesPress, this.I18n);
    }

    render() {
        General.logDebug(this.viewName(), 'render');
        return (
            <CHSContainer>
                <CHSContent ref='scroll'>
                    <AppHeader title={this.I18n.t(this.state.encounter.encounterType.displayName)}
                               func={() => this.onAppHeaderBack()} displayHomePressWarning={true}/>
                    <PreviousEncounterPullDownView showExpanded={this.state.previousEncountersDisplayed}
                                                   onCollapse={this.scrollToTop}
                                                   individual={this.state.encounter.individual}
                                                   actionName={Actions.TOGGLE_SHOWING_PREVIOUS_ENCOUNTER}
                                                   encounters={this.state.previousEncounters}/>
                    <View style={{flexDirection: 'column', paddingHorizontal: DGS.resizeWidth(26)}}>
                        <FormElementGroup observationHolder={new ObservationsHolder(this.state.encounter.observations)}
                                          group={this.state.formElementGroup}
                                          actions={Actions}
                                          validationResults={this.state.validationResults}
                                          filteredFormElements={this.state.filteredFormElements}
                                          formElementsUserState={this.state.formElementsUserState}
                                          dataEntryDate={this.state.encounter.encounterDateTime}
                                          onValidationError={(x, y) => this.scrollToPosition(x, y)}
                        />
                        <WizardButtons previous={{
                            func: () => this.previous(),
                            visible: !this.state.wizard.isFirstPage(),
                            label: this.I18n.t('previous')
                        }}
                                       next={{func: () => this.next(), label: this.I18n.t('next')}}/>
                    </View>
                </CHSContent>
            </CHSContainer>
        );
    }
}

export default IndividualEncounterView;
