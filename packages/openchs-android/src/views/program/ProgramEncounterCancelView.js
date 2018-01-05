import {View} from "react-native";
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import Reducers from "../../reducer";
import themes from "../primitives/themes";
import AppHeader from "../common/AppHeader";
import {ProgramEncounterCancelActionsNames as Actions} from "../../action/program/ProgramEncounterCancelActions";
import FormElementGroup from "../form/FormElementGroup";
import WizardButtons from "../common/WizardButtons";
import {ObservationsHolder} from "openchs-models";
import CHSNavigator from "../../utility/CHSNavigator";
import _ from "lodash";
import TypedTransition from "../../framework/routing/TypedTransition";
import General from "../../utility/General";
import Distances from "../primitives/Distances";
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
import FormMappingService from "../../service/FormMappingService";

@Path('/ProgramEncounterCancelView')
class ProgramEncounterCancelView extends AbstractComponent {
    static propTypes = {
        params: React.PropTypes.object.isRequired
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
                    CHSNavigator.navigateToProgramEnrolmentDashboardView(source, state.programEncounter.programEnrolment.individual.uuid);
                };
                const headerMessage = `${this.I18n.t(state.programEncounter.programEnrolment.program.name)}, ${this.I18n.t(state.programEncounter.encounterType.name)} - ${this.I18n.t('summaryAndRecommendations')}`;
                const formMappingService = this.context.getService(FormMappingService);
                const form = formMappingService.findFormForCancellingEncounterType(this.state.programEncounter.encounterType);
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
            <CHSContainer theme={themes}>
                <CHSContent ref="scroll">
                    <AppHeader title={this.state.programEncounter.programEnrolment.individual.nameString}
                               func={() => this.previous()}/>
                    <View style={{flexDirection: 'column', paddingHorizontal: Distances.ScaledContentDistanceFromEdge}}>
                        <FormElementGroup
                            observationHolder={new ObservationsHolder(this.state.programEncounter.cancelObservations)}
                            group={this.state.formElementGroup}
                            actions={Actions}
                            validationResults={this.state.validationResults}/>
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