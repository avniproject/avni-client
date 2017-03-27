import {View, StyleSheet} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import ReducerKeys from "../../reducer";
import themes from "../primitives/themes";
import AppHeader from "../common/AppHeader";
import {ProgramEncounterActionsNames as Actions} from "../../action/prorgam/ProgramEncounterActions";
import FormElementGroup from "../form/FormElementGroup";
import WizardButtons from "../common/WizardButtons";
import {Content, Container} from "native-base";
import ObservationsHolder from "../../models/ObservationsHolder";
import CHSNavigator from "../../utility/CHSNavigator";
import PrimitiveValue from "../../models/observation/PrimitiveValue";
import StaticFormElement from "../viewmodel/StaticFormElement";
import AbstractEncounter from "../../models/AbstractEncounter";
import AbstractDataEntryState from '../../state/AbstractDataEntryState';
import DateFormElement from '../../views/form/DateFormElement';

@Path('/ProgramEncounterView')
class ProgramEncounterView extends AbstractComponent {
    static propTypes = {
        params: React.PropTypes.object.isRequired
    };

    viewName() {
        return ProgramEncounterView.name;
    }

    constructor(props, context) {
        super(props, context, ReducerKeys.programEncounter);
    }

    componentWillMount() {
        this.dispatchAction(Actions.ON_LOAD, {programEncounter: this.props.params.programEncounter});
        return super.componentWillMount();
    }

    previous() {
    }

    next() {
        this.dispatchAction(Actions.NEXT, {
            completed: (state) => {
                CHSNavigator.navigateToProgramEnrolmentDashboardView(this, state.programEncounter.programEnrolment.individual.uuid);
            },
            movedNext: () => {
            },
            validationFailed: (newState) => {
            }
        });
    }

    render() {
        console.log('ProgramEncounterView.render');
        return (
            <Container theme={themes}>
                <Content>
                    <AppHeader title={this.state.programEncounter.programEnrolment.individual.name} func={() => this.previous()}/>
                    <View style={{flexDirection: 'column', paddingHorizontal: 10}}>
                        {this.state.wizard.isFirstFormPage() ?
                            <DateFormElement actionName={Actions.ENCOUNTER_DATE_TIME_CHANGED} element={new StaticFormElement('encounterDate')}
                                             dateValue={new PrimitiveValue(this.state.programEncounter.encounterDateTime)}
                                             validationResult={AbstractDataEntryState.getValidationError(this.state, AbstractEncounter.validationKeys.ENCOUNTER_DATE_TIME)}/>
                            :
                            <View/>
                        }
                        <FormElementGroup observationHolder={new ObservationsHolder(this.state.programEncounter.observations)} group={this.state.formElementGroup} actions={Actions}
                                          validationResults={this.state.validationResults}/>
                        <WizardButtons previous={{func: () => this.previous(), visible: !this.state.wizard.isFirstPage()}}
                                       next={{func: () => this.next(), label: this.I18n.t(AbstractDataEntryState.getNextButtonLabel(this.state))}}/>
                    </View>
                </Content>
            </Container>
        );
    }
}

export default ProgramEncounterView;