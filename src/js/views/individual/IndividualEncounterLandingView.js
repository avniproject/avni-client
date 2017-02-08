import {View, StyleSheet, ScrollView, TextInput} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import themes from "../primitives/themes";
import {Text, Content, Grid, Row, Container, InputGroup, Input} from "native-base";
import TypedTransition from "../../framework/routing/TypedTransition";
import IndividualEncounterView from "./IndividualEncounterView";
import moment from "moment";
import DynamicGlobalStyles from "../primitives/DynamicGlobalStyles";
import IndividualProfile from "../common/IndividualProfile";
import FormElementGroup from "../form/FormElementGroup";
import AppHeader from "../common/AppHeader";
import WizardButtons from "../common/WizardButtons";
import ReducerKeys from "../../reducer";
import {IndividualEncounterLandingViewActions as Actions} from "../../action/individual/EncounterActions";
import SystemRecommendationView from "../conclusion/SystemRecommendationView";
import _ from "lodash";

@Path('/IndividualEncounterLandingView')
class IndividualEncounterLandingView extends AbstractComponent {
    static propTypes = {
        params: React.PropTypes.object.isRequired,
    };

    viewName() {
        return "IndividualEncounterLandingView";
    }

    constructor(props, context) {
        super(props, context, ReducerKeys.encounterLanding);
    }

    componentWillMount() {
        if (!_.isNil(this.props.params.individualUUID))
            this.dispatchAction(Actions.NEW_ENCOUNTER, {individualUUID: this.props.params.individualUUID});
        return super.componentWillMount();
    }

    next() {
        this.dispatchAction(Actions.NEXT, {cb: (lastPage, encounter, formElementGroup, encounterDecisions) => {
            if (lastPage)
                TypedTransition.from(this).with({encounter: encounter, previousFormElementGroup: this.state.formElementGroup, encounterDecisions: encounterDecisions}).to(SystemRecommendationView);
            else
                TypedTransition.from(this).with({encounter: encounter, formElementGroup: formElementGroup}).to(IndividualEncounterView);
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
                            <Grid style={{backgroundColor: '#ffffff', paddingLeft: 10, paddingRight: 10}}>
                                <Row style={{backgroundColor: '#ffffff'}}>
                                    <Text style={DynamicGlobalStyles.formElementLabel}>{this.I18n.t("date")}</Text>
                                </Row>
                                <Row>
                                    <InputGroup style={{flex: 1}} borderType='underline'>
                                        <Input defaultValue={moment().format('DD-MMM-YYYY')}/>
                                    </InputGroup>
                                </Row>
                                <FormElementGroup group={this.state.formElementGroup}
                                                  encounter={this.state.encounter} actions={Actions}/>
                                <WizardButtons previous={{func: () => {}, visible: false}}
                                               next={{func: () => this.next(), visible: !this.state.formElementGroup.isLast}}/>
                            </Grid>
                        </Row>
                    </Grid>
                </Content>
            </Container>
        );
    }
}

export default IndividualEncounterLandingView;