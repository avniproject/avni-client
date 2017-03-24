import {View, StyleSheet} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import AppHeader from "../common/AppHeader";
import IndividualProfile from "../common/IndividualProfile";
import {Content, Container} from "native-base";
import themes from "../primitives/themes";
import {Actions} from "../../action/prorgam/ProgramEnrolmentActions";
import StaticFormElement from "../viewmodel/StaticFormElement";
import DateFormElement from "../form/DateFormElement";
import FormElementGroup from "../form/FormElementGroup";
import WizardButtons from "../common/WizardButtons";
import PrimitiveValue from "../../models/observation/PrimitiveValue";
import AbstractDataEntryState from "../../state/AbstractDataEntryState";
import CHSNavigator from "../../utility/CHSNavigator";

class ProgramFormComponent extends AbstractComponent {
    static propTypes = {
        context: React.PropTypes.object.isRequired,
        state: React.PropTypes.object.isRequired
    };

    next() {
        this.dispatchAction(Actions.NEXT, {
            validationFailed: () => {
            },
            completed: () => {
                CHSNavigator.navigateToProgramEnrolmentDashboardView(this, this.props.state.enrolment.individual.uuid, this.props.state.enrolment.uuid, this.props.context.usage);
            },
            movedNext: () => {
            }
        });
    }

    previous() {
        this.dispatchAction(Actions.PREVIOUS, {
            cb: (newState) => {
            }
        });
    }

    render() {
        return (<Container theme={themes}>
            <Content>
                <AppHeader title={this.I18n.t('enrolInSpecificProgram', {program: this.props.state.enrolment.program.name})}/>
                <View style={{marginLeft: 10, marginRight: 10, flexDirection: 'column'}}>
                    {this.props.state.wizard.isFirstFormPage() ?
                        <View>
                            <IndividualProfile viewContext={IndividualProfile.viewContext.Wizard} individual={this.props.state.enrolment.individual}/>
                            <DateFormElement actionName={this.props.context.dateAction} element={new StaticFormElement(this.props.context.dateKey)}
                                             dateValue={new PrimitiveValue(this.props.state.enrolment[this.props.context.dateField])}
                                             validationResult={AbstractDataEntryState.getValidationError(this.props.state, this.props.context.dateValidationKey)}/>
                        </View>
                        :
                        <View/>}
                    <FormElementGroup actions={Actions} group={this.props.state.formElementGroup} observationHolder={this.props.state.applicableObservationsHolder}
                                      validationResults={this.props.state.validationResults}/>
                    <WizardButtons previous={{visible: !this.props.state.wizard.isFirstPage(), func: () => this.previous()}}
                                   next={{func: () => this.next(), visible: true, label: this.I18n.t(this.nextButtonLabelKey)}}/>
                </View>
            </Content>
        </Container>);
    }

    get nextButtonLabelKey() {
        if (this.props.state.wizard.isLastPage()) {
            return this.props.state.newEnrolment ? 'enrol' : 'save';
        } else {
            return 'next';
        }
    }
}

export default ProgramFormComponent;