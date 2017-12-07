import {View} from "react-native";
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import themes from "../primitives/themes";
import TypedTransition from "../../framework/routing/TypedTransition";
import IndividualEncounterView from "./IndividualEncounterView";
import FormElementGroup from "../form/FormElementGroup";
import AppHeader from "../common/AppHeader";
import WizardButtons from "../common/WizardButtons";
import Reducers from "../../reducer";
import {IndividualEncounterViewActions as Actions} from "../../action/individual/EncounterActions";
import _ from "lodash";
import General from "../../utility/General";
import {ObservationsHolder, ValidationResult, AbstractEncounter, PrimitiveValue} from "openchs-models";
import CHSNavigator from "../../utility/CHSNavigator";
import PreviousEncounterPullDownView from "./PreviousEncounterPullDownView";
import StaticFormElement from "../viewmodel/StaticFormElement";
import DateFormElement from "../form/formElement/DateFormElement";
import Distances from "../primitives/Distances";
import CHSContent from "../common/CHSContent";
import CHSContainer from "../common/CHSContainer";

@Path('/IndividualEncounterLandingView')
class IndividualEncounterLandingView extends AbstractComponent {
    static propTypes = {
        encounter: React.PropTypes.object,
        individualUUID: React.PropTypes.string
    };

    viewName() {
        return 'IndividualEncounterLandingView';
    }

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.encounter);
    }

    componentWillMount() {
        this.dispatchAction(Actions.ON_ENCOUNTER_LANDING_LOAD, this.props);
        return super.componentWillMount();
    }

    shouldComponentUpdate(nextProps, state) {
        return !_.isNil(state.encounter) && state.wizard.isFirstPage();
    }

    next() {
        this.dispatchAction(Actions.NEXT, {
            validationFailed: (newState) => {
            },
            movedNext: () => {
                TypedTransition.from(this).to(IndividualEncounterView);
            },
            completed: (newState, encounterDecisions, ruleValidationErrors) => {
                const headerMessage = `${this.I18n.t(this.state.encounter.encounterType.name)} - ${this.I18n.t('summaryAndRecommendations')}`;
                CHSNavigator.navigateToSystemRecommendationViewFromEncounterWizard(this, encounterDecisions, ruleValidationErrors, this.state.encounter, Actions.SAVE, headerMessage);
            }
        });
    }

    render() {
        General.logDebug(this.viewName(), `render with IndividualUUID=${this.props.individualUUID} and EncounterTypeUUID=${this.props.encounter.encounterType.uuid}`);
        return (
            <CHSContainer theme={themes}>
                <CHSContent>
                    <AppHeader
                        title={`${this.I18n.t(this.state.encounter.encounterType.name)} - ${this.I18n.t('enterData')}`}/>
                    <PreviousEncounterPullDownView showExpanded={this.state.previousEncountersDisplayed}
                                                   individual={this.state.encounter.individual}
                                                   actionName={Actions.TOGGLE_SHOWING_PREVIOUS_ENCOUNTER}
                                                   encounters={this.state.previousEncounters}/>
                    <View style={{
                        backgroundColor: '#ffffff',
                        paddingHorizontal: Distances.ScaledContainerHorizontalDistanceFromEdge,
                        flexDirection: 'column'
                    }}>
                        <DateFormElement actionName={Actions.ENCOUNTER_DATE_TIME_CHANGE}
                                         element={new StaticFormElement(AbstractEncounter.fieldKeys.ENCOUNTER_DATE_TIME)}
                                         dateValue={new PrimitiveValue(this.state.encounter.encounterDateTime)}
                                         validationResult={ValidationResult.findByFormIdentifier(this.state.validationResults, AbstractEncounter.fieldKeys.ENCOUNTER_DATE_TIME)}/>
                        <FormElementGroup group={this.state.formElementGroup}
                                          observationHolder={new ObservationsHolder(this.state.encounter.observations)}
                                          actions={Actions}
                                          validationResults={this.state.validationResults}/>
                        <WizardButtons next={{
                            func: () => this.next(),
                            visible: true,
                            label: this.I18n.t('next')
                        }}/>
                    </View>
                </CHSContent>
            </CHSContainer>
        );
    }
}

export default IndividualEncounterLandingView;