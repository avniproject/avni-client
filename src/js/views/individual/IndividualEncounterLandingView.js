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
        TypedTransition.from(this).with({individual: this.props.params.individual}).to(IndividualEncounterView);
    }

    previous() {
        TypedTransition.from(this).goBack();
    }

    render() {
        return (
            <Container theme={themes}>
                <Content style={{backgroundColor: '#212121'}}>
                    <AppHeader title={this.I18n.t('generalConsultation')}/>
                    <Grid style={{marginLeft: 10, marginRight: 10}}>
                        <Row style={{height: 263}}>
                            <IndividualProfile landingView={true} individual={this.props.params.individual}/>
                        </Row>
                        <Row>
                            <Grid style={{backgroundColor: '#ffffff', paddingLeft:10, paddingRight: 10}}>
                            <Row style={{backgroundColor: '#ffffff'}}>
                                <Text style={DynamicGlobalStyles.formElementLabel}>{this.I18n.t("date")}</Text>
                            </Row>
                            <Row>
                                <InputGroup style={{flex: 1}} borderType='underline'>
                                    <Input defaultValue={moment().format('DD-MMM-YYYY')} />
                                </InputGroup>
                            </Row>
                            <FormElementGroup group={this.state.form[0].formElementGroups[0]}/>
                            <Row style={{marginTop: 30, marginBottom:30}}>
                                <Button primary
                                        style={{flex:0.5, backgroundColor: '#e0e0e0'}}
                                        textStyle={{color: '#212121'}} onPress={() => this.previous()}>
                                    PREVIOUS
                                </Button>
                                <Button primary style={{flex:0.5, marginLeft: 8}} onPress={() => this.next()}>NEXT</Button>
                            </Row>
                        </Grid>
                    </Row>
                    </Grid>
                </Content>
            </Container>
        );
    }
}

export default IndividualEncounterLandingView;