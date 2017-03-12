import {View, StyleSheet} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import AppHeader from "../common/AppHeader";
import IndividualProfile from "../common/IndividualProfile";
import Path from "../../framework/routing/Path";
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
import IndividualEncounterLandingView from "../individual/IndividualEncounterLandingView";
import ProgramEnrolment from '../../models/ProgramEnrolment';
import AbstractDataEntryState from '../../state/AbstractDataEntryState';
import CHSNavigator from "../../utility/CHSNavigator";

@Path('/ProgramEnrolmentView')
class ProgramEnrolmentView extends AbstractComponent {
    static propTypes = {
        params: React.PropTypes.object.isRequired
    };

    viewName() {
        return "ProgramEnrolmentView";
    }

    constructor(props, context) {
        super(props, context, ReducerKeys.programEnrolment);
    }

    componentWillMount() {
        this.dispatchAction(Actions.ON_LOAD, {enrolment: this.props.params.enrolment});
        return super.componentWillMount();
    }

    next() {
        this.dispatchAction(Actions.NEXT, {
            validationFailed: () => {
            },
            completed: () => {
                TypedTransition.from(this).resetTo(this.props.params.baseView);
            },
            movedNext: () => {
                CHSNavigator.navigateToProgramEnrolmentView(this, enrolment);
            }
        });
    }

    render() {
        return (<Container theme={themes}>
            <Content>
                <AppHeader title={this.I18n.t('enrolInSpecificProgram', {program: this.state.enrolment.program.name})}/>
                <View style={{marginLeft: 10, marginRight: 10, flexDirection: 'column'}}>
                    {this.state.wizard.isFirstFormPage() ?
                        <View>
                            <IndividualProfile landingView={false} individual={this.state.enrolment.individual}/>
                            <DateFormElement actionName={Actions.ENROLMENT_DATE_TIME_CHANGED} element={new StaticFormElement('enrolmentDate')}
                                             dateValue={new PrimitiveValue(this.state.enrolment.enrolmentDateTime)}
                                             validationResult={AbstractDataEntryState.getValidationError(this.state, ProgramEnrolment.validationKeys.ENROLMENT_DATE)}/>
                        </View>
                        :
                        <View/>}
                    <FormElementGroup actions={Actions} group={this.state.formElementGroup} observationHolder={this.state.enrolment}
                                      validationResults={this.state.validationResults}/>
                    <WizardButtons previous={{visible: !this.state.wizard.isFirstPage()}}
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

export default ProgramEnrolmentView;