import {DatePickerAndroid} from "react-native";
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

@Path('/IndividualEncounterLandingView')
class IndividualEncounterLandingView extends AbstractComponent {
    static propTypes = {
        params: React.PropTypes.object.isRequired,
    };

    viewName() {
        return IndividualEncounterLandingView.name;
    }

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.encounter);
    }

    componentWillMount() {
        this.dispatchAction(Actions.ON_ENCOUNTER_LANDING_LOAD, this.props.params);
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
            completed: (newState, encounterDecisions) => {
                CHSNavigator.navigateToSystemRecommendationViewFromEncounterWizard(this, encounterDecisions, this.state.encounter, Actions.SAVE);
            }
        });
    }

    render() {
        console.log('IndividualEncounterLandingView.render');
        return (
            <Container theme={themes}>
                <Content style={{backgroundColor: Colors.BlackBackground}}>
                    <AppHeader title={this.state.encounter.individual.name}/>
                    <Grid style={{marginLeft: 10, marginRight: 10}}>
                        <Row>
                            {/* TODO use DateFormElement instead of below code */}
                            <Grid style={{backgroundColor: '#ffffff', paddingHorizontal: 10}}>
                                <Row style={{backgroundColor: '#ffffff'}}>
                                    <Text style={DynamicGlobalStyles.formElementLabel}>{this.I18n.t("date")}</Text>
                                </Row>
                                <Row>
                                    <Text onPress={this.showPicker.bind(this, 'simple', {date: new Date()})}
                                          style={DynamicGlobalStyles.formElementLabel}>{this.dateDisplay(this.state.encounter.encounterDateTime)}</Text>
                                </Row>
                                <FormElementGroup group={this.state.formElementGroup}
                                                  observationHolder={new ObservationsHolder(this.state.encounter.observations)} actions={Actions}
                                                  validationResults={this.state.validationResults}/>
                                <WizardButtons next={{
                                    func: () => this.next(),
                                    visible: true,
                                    label: this.I18n.t('next')
                                }}/>
                            </Grid>
                        </Row>
                    </Grid>
                </Content>
            </Container>
        );
    }

    dateDisplay(date) {
        return _.isNil(date) ? this.I18n.t("chooseADate") : General.formatDate(date);
    }

    async showPicker(stateKey, options) {
        const {action, year, month, day} = await DatePickerAndroid.open(options);
        if (action !== DatePickerAndroid.dismissedAction) {
            this.dispatchAction(Actions.ENCOUNTER_DATE_TIME_CHANGE, {value: new Date(year, month, day)});
        }
    }

}

export default IndividualEncounterLandingView;