import {View, StyleSheet, ScrollView, TextInput} from 'react-native';
import React, {Component} from 'react';

import AbstractComponent from '../../framework/view/AbstractComponent';
import Path from "../../framework/routing/Path";
import themes from "../primitives/themes";
import {
    Text, Button, Content, CheckBox, Grid, Col, Row, Container, Header, Title, Icon, InputGroup,
    Input
} from "native-base";
import TypedTransition from "../../framework/routing/TypedTransition";
import IndividualEncounterView from "./IndividualEncounterView"
import moment from "moment";
import DynamicGlobalStyles from '../primitives/DynamicGlobalStyles';
import IndividualProfile from "../common/IndividualProfile";
import FormElementGroup from "../form/FormElementGroup";
import AppHeader from '../common/AppHeader';
import WizardButtons from '../common/WizardButtons';

@Path('/IndividualEncounterLandingView')
class IndividualEncounterLandingView extends AbstractComponent {
    static propTypes = {
        params: React.PropTypes.object.isRequired,
    };

    viewName() {
        return "IndividualEncounterLandingView";
    }

    constructor(props, context) {
        super(props, context, "individualEncounter");
    }

    next() {
        const next = this.state.forms[0].formElementGroups[0].next();
        TypedTransition.from(this).with({individual: this.props.params.individual, encounter: this.state.encounter, formElementGroup: next}).to(IndividualEncounterView);
    }

    previous() {
        TypedTransition.from(this).goBack();
    }

    render() {
        const formElementGroup = this.state.forms[0].formElementGroups[0];
        return (
            <Container theme={themes}>
                <Content style={{backgroundColor: '#212121'}}>
                    <AppHeader title={this.I18n.t('generalConsultation')}/>
                    <Grid style={{marginLeft: 10, marginRight: 10}}>
                        <Row style={{height: 263}}>
                            <IndividualProfile landingView={true} individual={this.props.params.individual}/>
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
                                <FormElementGroup group={formElementGroup}
                                                  encounter={this.state.encounter}/>
                                <WizardButtons previous={{func: () => this.previous(), visible: formElementGroup.displayOrder !== 1}}
                                               next={{func: () => this.next(), visible: !formElementGroup.isLast}}/>
                            </Grid>
                        </Row>
                    </Grid>
                </Content>
            </Container>
        );
    }
}

export default IndividualEncounterLandingView;