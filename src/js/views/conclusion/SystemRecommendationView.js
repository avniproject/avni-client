import AbstractComponent from "../../framework/view/AbstractComponent";
import React, {Component} from "react";
import {View} from "react-native";
import Path from "../../framework/routing/Path";
import themes from "../primitives/themes";
import IndividualProfile from "../common/IndividualProfile";
import {Text, Content, Grid, Col, Row, Container} from "native-base";
import TypedTransition from "../../framework/routing/TypedTransition";
import WizardButtons from "../common/WizardButtons";
import AppHeader from "../common/AppHeader";
import Colors from "../primitives/Colors";
import Observations from "../common/Observations";

@Path('/SystemRecommendationView')
class SystemRecommendationView extends AbstractComponent {
    static propTypes = {
        individual: React.PropTypes.object.isRequired,
        saveActionName: React.PropTypes.string.isRequired,
        onSaveCallback: React.PropTypes.func.isRequired,
        decisions: React.PropTypes.array.isRequired,
        observations: React.PropTypes.array.isRequired
    };

    viewName() {
        return SystemRecommendationView.name;
    }

    constructor(props, context) {
        super(props, context);
    }

    save() {
        this.dispatchAction(this.props.saveActionName, {
            cb: () => this.props.onSaveCallback(this),
            error: (message) => this.showError(message)
        });
    }

    previous() {
        TypedTransition.from(this).goBack();
    }

    render() {
        console.log(`SystemRecommendationView.render`);
        return (
            <Container theme={themes}>
                <Content>
                    <AppHeader title={this.props.individual.name}/>
                    <View style={{flexDirection: 'column'}}>
                        <View style={{backgroundColor: Colors.GreyContentBackground, paddingLeft: 24, paddingRight: 24, paddingTop: 12, paddingBottom: 12, height: 74}}>
                            <IndividualProfile viewContext={IndividualProfile.viewContext.Wizard} individual={this.props.individual}/>
                        </View>
                        <View style={{paddingLeft: 24, paddingRight: 24, paddingTop: 12, paddingBottom: 12, flexDirection: 'column'}}>
                            {
                                _.values(this.props.decisions).map((decision, index) => {
                                    return <View style={{backgroundColor: Colors.GreyContentBackground, paddingTop: 19, paddingBottom: 19, paddingLeft: 10}}
                                                key={`${index}`}>
                                            <Text style={{fontSize: 14}}>{decision.value}</Text>
                                    </View>
                                })}
                        </View>
                        <Observations observations={this.props.observations}/>
                        <View style={{marginLeft: 24, marginRight: 24}}>
                            <WizardButtons previous={{func: () => this.previous(), label: this.I18n.t('previous')}}
                                           next={{func: () => this.save(), label: this.I18n.t('save')}}/>
                        </View>
                    </View>
                </Content>
            </Container>
        );
    }
}

export default SystemRecommendationView;

