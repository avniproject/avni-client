import {View} from "react-native";
import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import Reducers from "../../reducer";
import themes from "../primitives/themes";
import AppHeader from "../common/AppHeader";
import {ProgramEncounterCancelActionsNames as Actions} from "../../action/program/ProgramEncounterCancelActions";
import FormElementGroup from "../form/FormElementGroup";
import WizardButtons from "../common/WizardButtons";
import {ObservationsHolder, ProgramEncounter} from 'openchs-models';
import CHSNavigator from "../../utility/CHSNavigator";
import _ from "lodash";
import TypedTransition from "../../framework/routing/TypedTransition";
import General from "../../utility/General";
import Distances from "../primitives/Distances";
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
import FormMappingService from "../../service/FormMappingService";
import EncounterService from "../../service/EncounterService";
import GeolocationFormElement from "../form/formElement/GeolocationFormElement";
import DateFormElement from "../form/formElement/DateFormElement";
import StaticFormElement from "../viewmodel/StaticFormElement";
import {  PrimitiveValue  } from 'openchs-models';
import AbstractDataEntryState from "../../state/AbstractDataEntryState";
import {  AbstractEncounter  } from 'openchs-models';

@Path('/ProgramEncounterCancelView')
class ProgramEncounterCancelView extends AbstractComponent {
    static propTypes = {
        params: PropTypes.object.isRequired
    };

    viewName() {
        return 'ProgramEncounterCancelView';
    }

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.programEncounterCancel);
    }

    componentWillMount() {
        this.dispatchAction(Actions.ON_LOAD, {programEncounter: this.props.params.programEncounter});
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
                const onSaveCallback = (source) => {
                    CHSNavigator.navigateToProgramEnrolmentDashboardView(source, state.programEncounter.programEnrolment.individual.uuid, state.programEncounter.programEnrolment.uuid, true,null, this.I18n.t('encounterCanceledMsg', {encounterName: state.programEncounter.encounterType.operationalEncounterTypeName}));
                };
                const headerMessage = `${this.I18n.t(state.programEncounter.programEnrolment.program.displayName)}, ${this.I18n.t(state.programEncounter.encounterType.displayName)} - ${this.I18n.t('summaryAndRecommendations')}`;
                const formMappingService = this.context.getService(FormMappingService);
                const form = formMappingService.findFormForCancellingEncounterType(this.state.programEncounter.encounterType, this.state.programEncounter.programEnrolment.program);
                CHSNavigator.navigateToSystemsRecommendationView(this, decisions, ruleValidationErrors, state.programEncounter.programEnrolment.individual, state.programEncounter.cancelObservations, Actions.SAVE, onSaveCallback, headerMessage, checklists, nextScheduledVisits, form);
            },
            movedNext: this.scrollToTop
        });
    }

    shouldComponentUpdate(nextProps, nextState) {
        return !_.isNil(nextState.programEncounter);
    }

    render() {
        General.logDebug('ProgramEncounterCancelView', 'render');
        return (
            <CHSContainer>
                <CHSContent ref="scroll">
                    <AppHeader title={this.state.programEncounter.programEnrolment.individual.nameString}
                               func={() => CHSNavigator.navigateToFirstPage(this, [ProgramEncounterCancelView])}/>
                    <View style={{flexDirection: 'column', paddingHorizontal: Distances.ScaledContentDistanceFromEdge}}>
                        {this.state.wizard.isFirstPage() &&
                            <GeolocationFormElement
                                location={this.state.programEncounter.cancelLocation}
                                editing={this.props.params.editing}
                                actionName={Actions.SET_CANCEL_LOCATION}
                                errorActionName={Actions.SET_LOCATION_ERROR}
                                validationResult={AbstractDataEntryState.getValidationError(this.state, ProgramEncounter.validationKeys.CANCEL_LOCATION)}
                            />
                        }
                        <FormElementGroup
                            observationHolder={new ObservationsHolder(this.state.programEncounter.cancelObservations)}
                            group={this.state.formElementGroup}
                            actions={Actions}
                            validationResults={this.state.validationResults}
                            filteredFormElements={this.state.filteredFormElements}
                            formElementsUserState={this.state.formElementsUserState}
                            dataEntryDate={this.state.programEncounter.cancelDateTime}
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

export default ProgramEncounterCancelView;
