import AbstractComponent from "../../framework/view/AbstractComponent";
import React, {Component} from "react";
import {View, StyleSheet, Navigator, Alert} from "react-native";
import Path from "../../framework/routing/Path";
import themes from "../primitives/themes";
import {Content, Container, Button, Text, Icon} from "native-base";
import TypedTransition from "../../framework/routing/TypedTransition";
import SystemRecommendationView from "../conclusion/SystemRecommendationView";
import IndividualProfile from "../common/IndividualProfile";
import FormElementGroup from "../form/FormElementGroup";
import {IndividualEncounterViewActions as Actions} from "../../action/individual/EncounterActions";
import Reducers from "../../reducer";
import AppHeader from "../common/AppHeader";
import WizardButtons from "../common/WizardButtons";
import PreviousEncounters from "../common/PreviousEncounters";
import Colors from "../primitives/Colors";
import ObservationsHolder from "../../models/ObservationsHolder";
import AbstractDataEntryState from "../../state/AbstractDataEntryState";
import CHSNavigator from "../../utility/CHSNavigator";
import IndividualEncounterLandingView from "./IndividualEncounterLandingView";
import BaseEntity from "../../models/BaseEntity";

@Path('/IndividualEncounterView')
class IndividualEncounterView extends AbstractComponent {
    viewName() {
        return IndividualEncounterView.name;
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
            completed: (state, encounterDecisions) => {
                CHSNavigator.navigateToSystemsRecommendationView(this, encounterDecisions, this.state.encounter.individual, Actions.SAVE, (source) => {
                    TypedTransition.from(source).wizardCompleted([SystemRecommendationView, IndividualEncounterLandingView, IndividualEncounterView], IndividualEncounterLandingView, {individualUUID: this.state.encounter.individual.uuid});
                });
            },
            validationFailed: (newState) => {
                if (AbstractDataEntryState.hasValidationError(this.state, BaseEntity.fieldKeys.EXTERNAL_RULE)) {
                    this.showError(newState.validationResults[0].message);
                }
            }
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
        console.log('IndividualEncounterView.render');
        return (
            <Container theme={themes}>
                <Content ref='abc'>
                    <AppHeader title={this.state.encounter.individual.name} func={() => this.previous()}/>

                    <View style={{flexDirection: 'column'}}>
                        {this.state.wizard.isShowPreviousEncounter() ? this.getExpandedView() : this.getCollapsedView()}
                        <FormElementGroup observationHolder={new ObservationsHolder(this.state.encounter.observations)} group={this.state.formElementGroup} actions={Actions}
                                          validationResults={this.state.validationResults}/>
                        <WizardButtons previous={{func: () => this.previous(), visible: !this.state.wizard.isFirstPage(), label: this.I18n.t('previous')}}
                                       next={{func: () => this.next(), label: this.I18n.t('next')}}/>
                    </View>
                </Content>
            </Container>
        );
    }

    toggleExpandCollapse = () => {
        this.dispatchAction(Actions.TOGGLE_SHOWING_PREVIOUS_ENCOUNTER);
    };

    getCollapsedView() {
        return (
            <View>
                <View style={{
                    backgroundColor: Colors.GreyContentBackground,
                    paddingLeft: 24,
                    paddingRight: 24,
                    paddingTop: 12,
                    paddingBottom: 12,
                    height: 74
                }}>
                    <IndividualProfile viewContext={IndividualProfile.viewContext.Wizard} individual={this.state.encounter.individual}/>
                </View>
                <View style={{flex: 1, flexDirection:'row', justifyContent:'center'}}>
                    <Button iconRight
                            style={{position: 'absolute', width:81, height:22, backgroundColor: Colors.SecondaryActionButtonColor, bottom:-11}}
                            onPress={this.toggleExpandCollapse}
                            textStyle={{color: '#212121'}}>
                        <Text>Expand</Text>
                        <Icon style={{color: '#212121'}} name='arrow-downward'/>
                    </Button>
                </View>
            </View>
        );
    }

    getExpandedView() {
        return (
            <View>
                <View style={{
                    backgroundColor: Colors.GreyContentBackground,
                    paddingLeft: 24,
                    paddingRight: 24,
                    paddingTop: 12,
                    paddingBottom: 12
                }}>
                    <IndividualProfile viewContext={IndividualProfile.viewContext.Wizard} individual={this.state.encounter.individual}/>
                    <Text style={{paddingLeft:10, paddingRight:10, borderBottomWidth: 1, borderColor: 'rgba(0, 0, 0, 0.12)'}}></Text>
                    <PreviousEncounters encounters={this.state.encounters}/>
                </View>
                <View style={{flex: 1, flexDirection:'row', justifyContent:'center'}}>
                    <Button iconRight light
                            style={{position: 'absolute', width:81, height:22, backgroundColor: Colors.SecondaryActionButtonColor, bottom:-11}}
                            onPress={() => this.toggleExpandCollapse()}
                            textStyle={{color: '#212121'}}>
                        <Text>Collapse</Text>
                        <Icon style={{color: '#212121'}} name='arrow-upward'/>
                    </Button>
                </View>
            </View>
        );
    }
}

export default IndividualEncounterView;
