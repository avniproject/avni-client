import {View, StyleSheet} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import AppHeader from "../common/AppHeader";
import IndividualProfile from "../common/IndividualProfile";
import {Content, Container} from "native-base";
import themes from "../primitives/themes";
import ReducerKeys from "../../reducer";
import {Actions} from "../../action/prorgam/ProgramEnrolmentActions";
import StaticFormElement from "../viewmodel/StaticFormElement";
import DateFormElement from "../form/DateFormElement";
import FormElementGroup from "../form/FormElementGroup";
import WizardButtons from "../common/WizardButtons";
import PrimitiveValue from "../../models/observation/PrimitiveValue";
import TypedTransition from "../../framework/routing/TypedTransition";
import AbstractDataEntryState from "../../state/AbstractDataEntryState";
import CHSNavigator from "../../utility/CHSNavigator";

class ProgramFormComponent extends AbstractComponent {
    static propTypes = {
        enrolment: React.PropTypes.object.isRequired,
        context: React.PropTypes.object.isRequired,
        observationHolder: React.PropTypes.object.isRequired
    };

    constructor(props, context) {
        super(props, context, ReducerKeys.programEnrolment);
    }

    componentWillMount() {
        this.dispatchAction(Actions.ON_LOAD, {enrolment: this.props.enrolment, usage: this.props.context.usage});
        return super.componentWillMount();
    }

    next() {
        this.dispatchAction(Actions.NEXT, {
            validationFailed: () => {
            },
            completed: () => {
                CHSNavigator.navigateToProgramEnrolmentDashboardView(this, this.state.enrolment.uuid);
            },
            movedNext: () => {
                CHSNavigator.navigateToProgramEnrolmentView(this, this.state.enrolment);
            }
        });
    }

    previous() {
        TypedTransition.from(this).goBack();
    }

    render() {
        return (<Container theme={themes}>
            <Content>
                <AppHeader title={this.I18n.t('enrolInSpecificProgram', {program: this.state.enrolment.program.name})}/>
                <View style={{marginLeft: 10, marginRight: 10, flexDirection: 'column'}}>
                    {this.state.wizard.isFirstFormPage() ?
                        <View>
                            <IndividualProfile landingView={false} individual={this.state.enrolment.individual}/>
                            <DateFormElement actionName={this.props.context.dateAction} element={new StaticFormElement(this.props.context.dateKey)}
                                             dateValue={new PrimitiveValue(this.state.enrolment[this.props.context.dateField])}
                                             validationResult={AbstractDataEntryState.getValidationError(this.state, this.props.context.dateValidationKey)}/>
                        </View>
                        :
                        <View/>}
                    <FormElementGroup actions={Actions} group={this.state.formElementGroup} observationHolder={this.props.observationHolder}
                                      validationResults={this.state.validationResults}/>
                    <WizardButtons previous={{visible: !this.state.wizard.isFirstPage(), func: () => this.previous()}}
                                   next={{func: () => this.next(), visible: true, label: this.I18n.t(this.nextButtonLabelKey)}}/>
                </View>
            </Content>
        </Container>);
    }

    get nextButtonLabelKey() {
        if (this.state.wizard.isLastPage()) {
            return this.state.newEnrolment ? 'enrol' : 'save';
        } else {
            return 'next';
        }
    }
}

export default ProgramFormComponent;