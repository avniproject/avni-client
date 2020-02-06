import {View} from "react-native";
import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import Reducers from "../../reducer";
import AppHeader from "../common/AppHeader";
import {ProgramEncounterCancelActionsNames as Actions} from "../../action/program/ProgramEncounterCancelActions";
import FormElementGroup from "../form/FormElementGroup";
import WizardButtons from "../common/WizardButtons";
import {ObservationsHolder, ProgramEncounter} from 'avni-models';
import CHSNavigator from "../../utility/CHSNavigator";
import _ from "lodash";
import TypedTransition from "../../framework/routing/TypedTransition";
import General from "../../utility/General";
import Distances from "../primitives/Distances";
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
import FormMappingService from "../../service/FormMappingService";
import GeolocationFormElement from "../form/formElement/GeolocationFormElement";
import AbstractDataEntryState from "../../state/AbstractDataEntryState";

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

    getCancelEncounterForm() {
        const formMappingService = this.context.getService(FormMappingService);
        const encounter = this.state.programEncounter;
        return _.isNil(encounter.programEnrolment) ? formMappingService.findFormForCancellingEncounterType(encounter.encounterType, null, encounter.individual.subjectType) :
            formMappingService.findFormForCancellingEncounterType(encounter.encounterType, encounter.programEnrolment.program, encounter.individual.subjectType);
    }

    _header(encounter) {
        const prefix = _.isNil(encounter.programEnrolment) ? encounter.individual.firstName : encounter.programEnrolment.program.displayName;
        return `${this.I18n.t(prefix)}, ${this.I18n.t(encounter.encounterType.displayName)} - ${this.I18n.t('summaryAndRecommendations')}`
    }

    onSaveCallback(source, encounter) {
        _.isNil(encounter.programEnrolment) ?
            CHSNavigator.navigateToIndividualEncounterDashboardView(source, encounter.individual.uuid, encounter, true, null, this.I18n.t('encounterCancelledMsg', {encounterName: encounter.encounterType.operationalEncounterTypeName})) :
            CHSNavigator.navigateToProgramEnrolmentDashboardView(source, encounter.individual.uuid, encounter.programEnrolment.uuid, true, null, this.I18n.t('encounterCancelledMsg', {encounterName: encounter.encounterType.operationalEncounterTypeName}));
    }

    next() {
        this.dispatchAction(Actions.NEXT, {
            completed: (state, decisions, ruleValidationErrors, checklists, nextScheduledVisits) => {
                const onSaveCallback = (source) => this.onSaveCallback(source, state.programEncounter);
                const headerMessage = this._header(state.programEncounter);
                const form = this.getCancelEncounterForm();
                CHSNavigator.navigateToSystemsRecommendationView(this, decisions, ruleValidationErrors, state.programEncounter.individual, state.programEncounter.cancelObservations, Actions.SAVE, onSaveCallback, headerMessage, checklists, nextScheduledVisits, form, state.workListState);
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
                    <AppHeader title={this.state.programEncounter.individual.nameString}
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
                            onValidationError={(x, y) => this.scrollToPosition(x, y)}
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
