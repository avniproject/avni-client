import AbstractComponent from "../../framework/view/AbstractComponent";
import React from "react";
import {View} from "react-native";
import Path from "../../framework/routing/Path";
import themes from "../primitives/themes";
import TypedTransition from "../../framework/routing/TypedTransition";
import FormElementGroup from "../form/FormElementGroup";
import {IndividualEncounterViewActions as Actions} from "../../action/individual/EncounterActions";
import Reducers from "../../reducer";
import AppHeader from "../common/AppHeader";
import WizardButtons from "../common/WizardButtons";
import {ObservationsHolder, Form} from "openchs-models";
import CHSNavigator from "../../utility/CHSNavigator";
import DGS from '../primitives/DynamicGlobalStyles';
import PreviousEncounterPullDownView from "./PreviousEncounterPullDownView";
import General from "../../utility/General";
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
import FormMappingService from "../../service/FormMappingService";

@Path('/IndividualEncounterView')
class IndividualEncounterView extends AbstractComponent {
    viewName() {
        return 'IndividualEncounterView';
    }

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.encounter);
    }

    componentWillMount() {
        this.dispatchAction(Actions.ON_LOAD);
        return super.componentWillMount();
    }

    shouldComponentUpdate(nextProps, nextState) {
        return !nextState.wizard.isFirstPage();
    }

    next() {
        this.dispatchAction(Actions.NEXT, {
            completed: (newState, encounterDecisions, ruleValidationErrors) => {
                const headerMessage = `${this.I18n.t(newState.encounter.encounterType.name)} - ${this.I18n.t('summaryAndRecommendations')}`;
                const formMappingService = this.context.getService(FormMappingService);
                const form = formMappingService.findFormForEncounterType(newState.encounter.encounterType, Form.formTypes.Encounter);
                CHSNavigator.navigateToSystemRecommendationViewFromEncounterWizard(this, encounterDecisions, ruleValidationErrors, newState.encounter, Actions.SAVE, headerMessage, form);
            },
            movedNext: this.scrollToTop,
            validationFailed: (newState) => {
            },
        });
    }

    previous() {
        this.dispatchAction(Actions.PREVIOUS, {
            cb: (newState) => {
                if (newState.wizard.isFirstPage())
                    TypedTransition.from(this).goBack();
            }
        });
    }

    render() {
        General.logDebug(this.viewName(), 'render');
        return (
            <CHSContainer theme={themes}>
                <CHSContent ref='scroll'>
                    <AppHeader title={this.I18n.t(this.state.encounter.encounterType.name)}
                               func={() => this.previous()}/>
                    <PreviousEncounterPullDownView showExpanded={this.state.previousEncountersDisplayed}
                                                   onCollapse={this.scrollToTop}
                                                   individual={this.state.encounter.individual}
                                                   actionName={Actions.TOGGLE_SHOWING_PREVIOUS_ENCOUNTER}
                                                   encounters={this.state.previousEncounters}/>
                    <View style={{flexDirection: 'column', paddingHorizontal: DGS.resizeWidth(26)}}>
                        <FormElementGroup observationHolder={new ObservationsHolder(this.state.encounter.observations)}
                                          group={this.state.formElementGroup}
                                          actions={Actions}
                                          validationResults={this.state.validationResults}
                                          filteredFormElements={this.state.filteredFormElements}
                                          formElementsUserState={this.state.formElementsUserState}
                        />
                        <WizardButtons previous={{
                            func: () => this.previous(),
                            visible: !this.state.wizard.isFirstPage(),
                            label: this.I18n.t('previous')
                        }}
                                       next={{func: () => this.next(), label: this.I18n.t('next')}}/>
                    </View>
                </CHSContent>
            </CHSContainer>
        );
    }
}

export default IndividualEncounterView;
