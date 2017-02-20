import AbstractComponent from "../../framework/view/AbstractComponent";
import React, {Component} from "react";
import {View, StyleSheet, Navigator, Alert} from "react-native";
import Path from "../../framework/routing/Path";
import themes from "../primitives/themes";
import {Content, Grid, Row, Container} from "native-base";
import TypedTransition from "../../framework/routing/TypedTransition";
import SystemRecommendationView from "../conclusion/SystemRecommendationView";
import IndividualProfile from "../common/IndividualProfile";
import FormElementGroup from "../form/FormElementGroup";
import {IndividualEncounterViewActions as Actions} from "../../action/individual/EncounterActions";
import ReducerKeys from "../../reducer";
import AppHeader from "../common/AppHeader";
import WizardButtons from "../common/WizardButtons";
import IndividualEncounterLandingView from "./IndividualEncounterLandingView";

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
            validationSuccessful: (encounterDecisions) => {
                TypedTransition.from(this).with({
                    encounter: this.state.encounter,
                    previousFormElementGroup: this.state.formElementGroup,
                    encounterDecisions: encounterDecisions
                }).to(SystemRecommendationView);
            },
            cb: () => {
                TypedTransition.from(this).with().to(IndividualEncounterView);
            },
            validationError: (message) => {
                Alert.alert(this.I18n.t("validationError"), message,
                    [
                        {
                            text: this.I18n.t('ok'), onPress: () => {
                        }
                        }
                    ]
                );
            }
        });
    }

    previous() {
        this.dispatchAction(Actions.PREVIOUS, {
            cb: (firstPage) => {
                TypedTransition.from(this).to(firstPage ? IndividualEncounterLandingView : IndividualEncounterView, Navigator.SceneConfigs.FloatFromLeft, true);
            }
        });
    }

    render() {
        console.log('IndividualEncounterView.render');
        return (
            <Container theme={themes}>
                <Content>
                    <AppHeader title={this.state.encounter.individual.name}/>
                    <View style={{flexDirection: 'column'}}>
                        <View style={{
                            backgroundColor: '#f7f7f7',
                            paddingLeft: 24,
                            paddingRight: 24,
                            paddingTop: 12,
                            paddingBottom: 12,
                            height: 74
                        }}>
                            <IndividualProfile landingView={false} individual={this.state.encounter.individual}/>
                        </View>
                        <FormElementGroup observationHolder={this.state.encounter} group={this.state.formElementGroup} actions={Actions}
                                          validationResults={this.state.validationResults}/>
                        <WizardButtons previous={{func: () => this.previous(), visible: !this.state.wizard.isFirstPage()}}
                                       next={{func: () => this.next(), visible: true}} nextDisabled={this.state.validationResults.length !== 0}/>
                    </View>
                </Content>
            </Container>
        );
    }
}

export default IndividualEncounterView;
