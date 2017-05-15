import {View, StyleSheet} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import Reducers from "../../reducer";
import themes from "../primitives/themes";
import AppHeader from "../common/AppHeader";
import {ProgramEncounterActionsNames as Actions} from "../../action/program/ProgramEncounterActions";
import FormElementGroup from "../form/FormElementGroup";
import WizardButtons from "../common/WizardButtons";
import {Content, Container} from "native-base";
import ObservationsHolder from "../../models/ObservationsHolder";
import CHSNavigator from "../../utility/CHSNavigator";
import PrimitiveValue from "../../models/observation/PrimitiveValue";
import StaticFormElement from "../viewmodel/StaticFormElement";
import AbstractEncounter from "../../models/AbstractEncounter";
import AbstractDataEntryState from "../../state/AbstractDataEntryState";
import DateFormElement from "../../views/form/DateFormElement";
import _ from "lodash";
import TypedTransition from "../../framework/routing/TypedTransition";
import General from "../../utility/General";
import Distances from "../primitives/Distances";

@Path('/ProgramEncounterView')
class ProgramEncounterView extends AbstractComponent {
    static propTypes = {
        params: React.PropTypes.object.isRequired
    };

    viewName() {
        return 'ProgramEncounterView';
    }

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.programEncounter);
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
                CHSNavigator.navigateToSystemsRecommendationView(this, decisions, ruleValidationErrors, state.programEncounter.programEnrolment.individual, state.programEncounter.observations, Actions.SAVE, onSaveCallback, headerMessage, checklists, nextScheduledVisits);
            },
        });
    }

    shouldComponentUpdate(nextProps, state) {
        return !_.isNil(state.programEncounter);
    }

    render() {
        General.logDebug('ProgramEncounterView', 'render');
        return (
            <Container theme={themes}>
                <Content>
                    <AppHeader title={this.state.programEncounter.programEnrolment.individual.name} func={() => this.previous()}/>
                    <View style={{flexDirection: 'column', paddingHorizontal: Distances.ScaledContentDistanceFromEdge}}>
                        {this.state.wizard.isFirstFormPage() ?
                            <DateFormElement actionName={Actions.ENCOUNTER_DATE_TIME_CHANGED} element={new StaticFormElement('encounterDate')}
                                             dateValue={new PrimitiveValue(this.state.programEncounter.encounterDateTime)}
                                             validationResult={AbstractDataEntryState.getValidationError(this.state, AbstractEncounter.fieldKeys.ENCOUNTER_DATE_TIME)}/>
                            :
                            <View/>
                        }
                        <FormElementGroup observationHolder={new ObservationsHolder(this.state.programEncounter.observations)} group={this.state.formElementGroup}
                                          actions={Actions}
                                          validationResults={this.state.validationResults}/>
                        <WizardButtons previous={{func: () => this.previous(), visible: !this.state.wizard.isFirstPage(), label: this.I18n.t('previous')}}
                                       next={{func: () => this.next(), label: this.I18n.t('next')}}/>
                    </View>
                </Content>
            </Container>
        );
    }
}

export default ProgramEncounterView;