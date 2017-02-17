import {View, StyleSheet, ScrollView, TextInput, DatePickerAndroid} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import themes from "../primitives/themes";
import {Text, Content, Grid, Row, Container, InputGroup, Input} from "native-base";
import TypedTransition from "../../framework/routing/TypedTransition";
import IndividualEncounterView from "./IndividualEncounterView";
import DynamicGlobalStyles from "../primitives/DynamicGlobalStyles";
import IndividualProfile from "../common/IndividualProfile";
import FormElementGroup from "../form/FormElementGroup";
import AppHeader from "../common/AppHeader";
import WizardButtons from "../common/WizardButtons";
import ReducerKeys from "../../reducer";
import {IndividualEncounterViewActions as Actions} from "../../action/individual/EncounterActions";
import SystemRecommendationView from "../conclusion/SystemRecommendationView";
import _ from "lodash";
import General from "../../utility/General";

@Path('/IndividualEncounterLandingView')
class IndividualEncounterLandingView extends AbstractComponent {
    static propTypes = {
        params: React.PropTypes.object.isRequired,
    };

    viewName() {
        return "IndividualEncounterLandingView";
    }

    constructor(props, context) {
        super(props, context, ReducerKeys.encounter);
    }

    componentWillMount() {
        if (!_.isNil(this.props.params.individualUUID))
            this.dispatchAction(Actions.NEW_ENCOUNTER, {individualUUID: this.props.params.individualUUID});
        return super.componentWillMount();
    }

    next() {
        this.dispatchAction(Actions.NEXT, {cb: (lastPage, encounterDecisions) => {
            if (lastPage)
                TypedTransition.from(this).with({encounter: this.state.encounter, previousFormElementGroup: this.state.formElementGroup, encounterDecisions: encounterDecisions}).to(SystemRecommendationView);
            else
                TypedTransition.from(this).with().to(IndividualEncounterView);
        }});
    }

    render() {
        console.log('IndividualEncounterLandingView.render');
        return (
            <Container theme={themes}>
                <Content style={{backgroundColor: '#212121'}}>
                    <AppHeader title={this.I18n.t('generalConsultation')}/>
                    <Grid style={{marginLeft: 10, marginRight: 10}}>
                        <Row style={{height: 263}}>
                            <IndividualProfile landingView={true} individual={this.state.encounter.individual}/>
                        </Row>
                        <Row>
                            {/* TODO use DateFormElement instead of below code */}
                            <Grid style={{backgroundColor: '#ffffff', paddingLeft: 10, paddingRight: 10}}>
                                <Row style={{backgroundColor: '#ffffff'}}>
                                    <Text style={DynamicGlobalStyles.formElementLabel}>{this.I18n.t("date")}</Text>
                                </Row>
                                <Row>
                                    <Text onPress={this.showPicker.bind(this, 'simple', {date: new Date()})}
                                          style={DynamicGlobalStyles.formElementLabel}>{this.dateDisplay(this.state.encounter.encounterDateTime)}</Text>
                                </Row>
                                <FormElementGroup group={this.state.formElementGroup}
                                                  encounter={this.state.encounter} actions={Actions} validationResults={this.state.validationResults}/>
                                <WizardButtons previous={{func: () => {}, visible: false}}
                                               next={{func: () => this.next(), visible: !this.state.formElementGroup.isLast}} nextDisabled={this.state.validationResults.length !== 0}/>
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