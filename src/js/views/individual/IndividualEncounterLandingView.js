import {DatePickerAndroid, View} from "react-native";
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import themes from "../primitives/themes";
import {Container, Content, Grid, Row, Text} from "native-base";
import TypedTransition from "../../framework/routing/TypedTransition";
import IndividualEncounterView from "./IndividualEncounterView";
import DynamicGlobalStyles from "../primitives/DynamicGlobalStyles";
import IndividualProfile from "../common/IndividualProfile";
import FormElementGroup from "../form/FormElementGroup";
import AppHeader from "../common/AppHeader";
import WizardButtons from "../common/WizardButtons";
import Reducers from "../../reducer";
import {IndividualEncounterViewActions as Actions} from "../../action/individual/EncounterActions";
import _ from "lodash";
import General from "../../utility/General";
import Colors from "../primitives/Colors";
import ObservationsHolder from "../../models/ObservationsHolder";
import CHSNavigator from "../../utility/CHSNavigator";
import DatePicker from "../primitives/DatePicker";
import ValidationResult from "../../models/application/ValidationResult";
import AbstractEncounter from '../../models/AbstractEncounter';
import PreviousEncounterPullDownView from "./PreviousEncounterPullDownView";
import StaticFormElement from "../viewmodel/StaticFormElement";
import DateFormElement from "../form/DateFormElement";
import PrimitiveValue from "../../models/observation/PrimitiveValue";

@Path('/IndividualEncounterLandingView')
class IndividualEncounterLandingView extends AbstractComponent {
    static propTypes = {
        encounter: React.PropTypes.object,
        individualUUID: React.PropTypes.string
    };

    viewName() {
        return IndividualEncounterLandingView.name;
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
            movedNext: (newState) => {
                TypedTransition.from(this).to(IndividualEncounterView);
            },
            completed: (newState, encounterDecisions, ruleValidationErrors) => {
                CHSNavigator.navigateToSystemRecommendationViewFromEncounterWizard(this, encounterDecisions, ruleValidationErrors, this.state.encounter, Actions.SAVE);
            }
        });
    }

    render() {
        this.log(`render with IndividualUUID=${this.props.individualUUID} and EncounterTypeUUID=${this.props.encounter.encounterType.uuid}`);
        return (
            <Container theme={themes}>
                <Content>
                    <AppHeader title={this.I18n.t(this.state.encounter.encounterType.name)}/>
                    <PreviousEncounterPullDownView showExpanded={this.state.wizard.doShowPreviousEncounter()} individual={this.state.encounter.individual}
                                                   actionName={Actions.TOGGLE_SHOWING_PREVIOUS_ENCOUNTER} encounters={this.state.encounters}/>
                    <View style={{backgroundColor: '#ffffff', paddingHorizontal: DynamicGlobalStyles.resizeWidth(26), flexDirection: 'column'}}>
                        <DateFormElement actionName={Actions.ENCOUNTER_DATE_TIME_CHANGE} element={new StaticFormElement(AbstractEncounter.fieldKeys.ENCOUNTER_DATE_TIME)}
                                         dateValue={new PrimitiveValue(this.state.encounter.encounterDateTime)}
                                         validationResult={ValidationResult.findByFormIdentifier(this.state.validationResults, AbstractEncounter.fieldKeys.ENCOUNTER_DATE_TIME)}/>
                        <FormElementGroup group={this.state.formElementGroup}
                                          observationHolder={new ObservationsHolder(this.state.encounter.observations)} actions={Actions}
                                          validationResults={this.state.validationResults}/>
                        <WizardButtons next={{
                            func: () => this.next(),
                            visible: true,
                            label: this.I18n.t('next')
                        }}/>
                    </View>
                </Content>
            </Container>
        );
    }
}

export default IndividualEncounterLandingView;