import {ToastAndroid, View} from "react-native";
import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import Reducers from "../../reducer";
import AppHeader from "../common/AppHeader";
import {ProgramEncounterActionsNames as Actions} from "../../action/program/ProgramEncounterActions";
import FormElementGroup from "../form/FormElementGroup";
import WizardButtons from "../common/WizardButtons";
import {AbstractEncounter, ObservationsHolder, PrimitiveValue, ProgramEncounter, Form} from 'openchs-models';
import CHSNavigator from "../../utility/CHSNavigator";
import StaticFormElement from "../viewmodel/StaticFormElement";
import AbstractDataEntryState from "../../state/AbstractDataEntryState";
import DateFormElement from "../../views/form/formElement/DateFormElement";
import _ from "lodash";
import TypedTransition from "../../framework/routing/TypedTransition";
import General from "../../utility/General";
import Distances from "../primitives/Distances";
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
import FormMappingService from "../../service/FormMappingService";
import GeolocationFormElement from "../form/formElement/GeolocationFormElement";
import ProgramEncounterService from "../../service/program/ProgramEncounterService";
import moment from "moment";
import NewVisitPageView from "./NewVisitPageView";

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
    }

    componentWillMount() {
        const {encounterType, enrolmentUUID, programEncounter, workLists} = this.props.params;
        if (programEncounter) {
            this.dispatchAction(Actions.ON_LOAD, {programEncounter, workLists});
            return super.componentWillMount();
        }
        const programEncounterByType = this.context.getService(ProgramEncounterService)
            .findDueEncounter({encounterTypeName: encounterType, enrolmentUUID})
            .cloneForEdit();
        programEncounterByType.encounterDateTime = moment().toDate();
        this.dispatchAction(Actions.ON_LOAD, {programEncounter: programEncounterByType});
        return super.componentWillMount();
    }

    onHardwareBackPress() {
        this.previous();
        return true;
    }

    previous() {
        if (this.state.wizard.isFirstFormPage())
            TypedTransition.from(this).goBack();
        else
            this.dispatchAction(Actions.PREVIOUS);
    }

    next() {
        this.dispatchAction(Actions.NEXT, {
            completed: (state, decisions, ruleValidationErrors, checklists, nextScheduledVisits) => {
                const {programEncounter} = state;
                const {programEnrolment} = programEncounter;
                const encounterName = programEncounter.name || programEncounter.encounterType.name;
                const onSaveCallback = this.props.params.onSaveCallback || (source => {
                    CHSNavigator.navigateToProgramEnrolmentDashboardView(source, programEnrolment.individual.uuid, programEnrolment.uuid, true,
                        this.props.params.backFunction, this.I18n.t('encounterSavedMsg', {encounterName}));
                });
                const headerMessage = `${this.I18n.t(programEnrolment.program.displayName)}, ${this.I18n.t(encounterName)} - ${this.I18n.t('summaryAndRecommendations')}`;
                const formMappingService = this.context.getService(FormMappingService);
                const form = formMappingService.findFormForEncounterType(this.state.programEncounter.encounterType, Form.formTypes.ProgramEncounter, this.state.programEncounter.programEnrolment.individual.subjectType);
                CHSNavigator.navigateToSystemsRecommendationView(this, decisions, ruleValidationErrors, programEnrolment.individual, programEncounter.observations, Actions.SAVE, onSaveCallback, headerMessage, checklists, nextScheduledVisits, form, state.workListState);
            },
            movedNext: this.scrollToTop
        });
    }

    shouldComponentUpdate(nextProps, nextState) {
        return !_.isNil(nextState.programEncounter);
    }

    displayMessage(message) {
        if (message && this.state.messageDisplayed){
            ToastAndroid.show(message, ToastAndroid.SHORT);
            this.dispatchAction(Actions.DISPLAY_MESSAGE);
        }
    }

    render() {
        General.logDebug('ProgramEncounterView', 'render');
        const programEncounterName = !_.isEmpty(this.state.programEncounter.encounterType.operationalEncounterTypeName) ? this.I18n.t(this.state.programEncounter.encounterType.operationalEncounterTypeName) : this.I18n.t(this.state.programEncounter.name);
        const title = `${this.state.programEncounter.programEnrolment.individual.nameString} - ${programEncounterName}`;
        this.displayMessage(this.props.params.message);
        return (
            <CHSContainer>
                <CHSContent ref="scroll">
                    <AppHeader title={title}
                               func={() => CHSNavigator.navigateToFirstPage(this, [ProgramEncounterView, NewVisitPageView])}/>
                    <View style={{flexDirection: 'column', paddingHorizontal: Distances.ScaledContentDistanceFromEdge}}>
                        {this.state.wizard.isFirstFormPage() ?
                            <View>
                                <GeolocationFormElement
                                    location={this.state.programEncounter.encounterLocation}
                                    editing={this.props.params.editing}
                                    actionName={Actions.SET_ENCOUNTER_LOCATION}
                                    errorActionName={Actions.SET_LOCATION_ERROR}
                                    validationResult={AbstractDataEntryState.getValidationError(this.state, ProgramEncounter.validationKeys.ENCOUNTER_LOCATION)}
                                />
                                <DateFormElement actionName={Actions.ENCOUNTER_DATE_TIME_CHANGED}
                                                 element={new StaticFormElement('encounterDate')}
                                                 dateValue={new PrimitiveValue(this.state.programEncounter.encounterDateTime)}
                                                 validationResult={AbstractDataEntryState.getValidationError(this.state, AbstractEncounter.fieldKeys.ENCOUNTER_DATE_TIME)}/>
                            </View>
                            :
                            <View/>
                        }
                        <FormElementGroup
                            observationHolder={new ObservationsHolder(this.state.programEncounter.observations)}
                            group={this.state.formElementGroup}
                            actions={Actions}
                            validationResults={this.state.validationResults}
                            filteredFormElements={this.state.filteredFormElements}
                            formElementsUserState={this.state.formElementsUserState}
                            dataEntryDate={this.state.programEncounter.encounterDateTime}
                        />
                        <WizardButtons previous={{
                            func: () => this.previous(),
                            visible: !this.state.wizard.isFirstPage(),
                            label: this.I18n.t('previous')
                        }} next={{
                            func: () => this.next(), label: this.I18n.t('next')
                        }}/>
                    </View>
                </CHSContent>
            </CHSContainer>
        );
    }
}

export default ProgramEncounterView;
