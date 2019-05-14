import {View} from "react-native";
import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import Reducers from "../../reducer";
import themes from "../primitives/themes";
import AppHeader from "../common/AppHeader";
import {ChecklistItemActionNames as Actions} from "../../action/program/ChecklistItemActions";
import FormElementGroup from "../form/FormElementGroup";
import WizardButtons from "../common/WizardButtons";
import {ObservationsHolder, PrimitiveValue, AbstractEncounter} from 'openchs-models';
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

@Path('/ChecklistItemView')
class ChecklistItemView extends AbstractComponent {
    static propTypes = {
        params: PropTypes.object.isRequired
    };

    viewName() {
        return 'ChecklistItemView';
    }

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.checklistItem);
    }

    componentWillMount() {
        this.dispatchAction(Actions.ON_LOAD, {checklistItem: this.props.params.checklistItem});
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
                    CHSNavigator.navigateToProgramEnrolmentDashboardView(source, state.checklistItem.checklist.programEnrolment.individual.uuid, state.checklistItem.checklist.programEnrolment.uuid, true,null, `${this.I18n.t(state.checklistItem.checklist.detail.name)} ${this.I18n.t('saved')}`);
                };
                const headerMessage = `${this.I18n.t(state.checklistItem.checklist.programEnrolment.program.displayName)}, ${this.I18n.t(state.checklistItem.checklist.detail.name)} - ${this.I18n.t('summaryAndRecommendations')}`;
                CHSNavigator.navigateToSystemsRecommendationView(this, decisions, ruleValidationErrors, state.checklistItem.checklist.programEnrolment.individual, state.checklistItem.observations, Actions.SAVE, onSaveCallback, headerMessage, checklists, nextScheduledVisits, state.checklistItem.detail.form);
            },
            movedNext: this.scrollToTop
        });
    }

    shouldComponentUpdate(nextProps, nextState) {
        return !_.isNil(nextState.checklistItem);
    }

    render() {
        General.logDebug('ChecklistItemView', 'render');
        return (
            <CHSContainer>
                <CHSContent ref="scroll">
                    <AppHeader title={this.state.checklistItem.checklist.programEnrolment.individual.nameString}
                               func={() => this.previous()}/>
                    <View style={{flexDirection: 'column', paddingHorizontal: Distances.ScaledContentDistanceFromEdge}}>
                        {this.state.wizard.isFirstFormPage() ?
                            <DateFormElement actionName={Actions.ENCOUNTER_DATE_TIME_CHANGED}
                                             element={new StaticFormElement('completionDate', true)}
                                             dateValue={new PrimitiveValue(this.state.checklistItem.completionDate ? this.state.checklistItem.completionDate : new Date())}
                                             validationResult={AbstractDataEntryState.getValidationError(this.state, AbstractEncounter.fieldKeys.ENCOUNTER_DATE_TIME)}/>
                            :
                            <View/>
                        }
                        <FormElementGroup
                            observationHolder={new ObservationsHolder(this.state.checklistItem.observations)}
                            group={this.state.formElementGroup}
                            actions={Actions}
                            dataEntryDate={this.state.checklistItem.completionDate ? this.state.checklistItem.completionDate : new Date()}
                            validationResults={this.state.validationResults}
                            filteredFormElements={this.state.filteredFormElements}
                            formElementsUserState={this.state.formElementsUserState}/>
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

export default ChecklistItemView;
