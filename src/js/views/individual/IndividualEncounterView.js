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
import ReducerKeys from "../../reducer";
import AppHeader from "../common/AppHeader";
import WizardButtons from "../common/WizardButtons";
import IndividualEncounterLandingView from "./IndividualEncounterLandingView";
import PreviouEncounter from '../common/PreviousEncounter'
import Colors from '../primitives/Colors';
import EncounterActionState from '../../state/EncounterActionState';

@Path('/IndividualEncounterView')
class IndividualEncounterView extends AbstractComponent {
    static propTypes = {
        params: React.PropTypes.object.isRequired
    };

    viewName() {
        return "IndividualEncounterView";
    }

    constructor(props, context) {
        super(props, context, ReducerKeys.encounter);
    }

    componentWillMount() {
        this.dispatchAction(Actions.ON_LOAD);
        return super.componentWillMount();
    }

    next() {
        this.dispatchAction(Actions.NEXT, {
            validationSuccessful: (encounterDecisions, encounter, formElementGroup) => {
                TypedTransition.from(this).with({
                    encounter: encounter,
                    previousFormElementGroup: formElementGroup,
                    encounterDecisions: encounterDecisions
                }).to(SystemRecommendationView);
            },
            movedNext: () => {
                TypedTransition.from(this).with().to(IndividualEncounterView);
            },
            validationFailed: (newState) => {
                if (EncounterActionState.hasOnlyExternalRuleError(this.state)) {
                    Alert.alert(this.I18n.t("validationError"), newState.validationResults[0].message,
                        [
                            {
                                text: this.I18n.t('ok'), onPress: () => {}
                            }
                        ]
                    );
                }
            }
        });
    }

    previous() {
        this.dispatchAction(Actions.PREVIOUS, {
            cb: (firstPage) => {
                TypedTransition.from(this).to(firstPage ? IndividualEncounterLandingView : IndividualEncounterView, true);
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
                        <FormElementGroup observationHolder={this.state.encounter} group={this.state.formElementGroup} actions={Actions}
                                          validationResults={this.state.validationResults}/>
                        <WizardButtons previous={{func: () => this.previous(), visible: !this.state.wizard.isFirstPage()}}
                                       next={{func: () => this.next(), visible: true}}/>
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
                    <IndividualProfile landingView={false} individual={this.state.encounter.individual}/>
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
                    <IndividualProfile landingView={false} individual={this.state.encounter.individual}/>
                    <Text style={{paddingLeft:10, paddingRight:10, borderBottomWidth: 1, borderColor: 'rgba(0, 0, 0, 0.12)'}}></Text>
                    <PreviouEncounter encounters={this.state.encounters}/>
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
