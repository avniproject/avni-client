import {View, StyleSheet, ScrollView, TextInput} from 'react-native';
import React, {Component} from 'react';
import MessageService from "../../service/MessageService";
import AbstractComponent from '../../framework/view/AbstractComponent';
import Path from "../../framework/routing/Path";
import themes from "../primitives/themes";
import {
    Text, Button, Content, CheckBox, Grid, Col, Row, Container, Header, Title, Icon, InputGroup,
    Input
} from "native-base";
import {GlobalStyles} from '../primitives/GlobalStyles';
import TypedTransition from "../../framework/routing/TypedTransition";
import IndividualEncounterView from "./IndividualEncounterView"
import moment from "moment";
import DynamicGlobalStyles from '../primitives/DynamicGlobalStyles';
import IndividualProfile from "../common/IndividualProfile"
import FormElement from "../form/FormElement"

@Path('/IndividualEncounterLandingView')
class IndividualEncounterLandingView extends AbstractComponent {
    static propTypes = {
        params: React.PropTypes.object.isRequired,
    };

    viewName() {
        return "IndividualEncounterLandingView";
    }

    constructor(props, context) {
        super(props, context);
        this.I18n = this.context.getService(MessageService).getI18n();
        this.unsubscribe = context.getStore().subscribe(this.refreshState.bind(this));
    }

    next() {
        TypedTransition.from(this).with({individual: this.props.params.individual}).to(IndividualEncounterView);
    }

    previous() {
        TypedTransition.from(this).goBack();
    }

    componentWillMount() {
        this.refreshState();
    }


    refreshState() {
        console.log("Setting the state");
        this.setState({formElementGroup: this.getContextState("individualEncounterForm")[0].formElementGroups[0]});
    }


    render() {
        console.log(this.state.formElementGroup.formElements.length);
        return (
            <Container theme={themes}>
                <Header style={{backgroundColor: '#212121'}}>
                    <Button transparent onPress={() => {
                        TypedTransition.from(this).goBack()
                    }}>
                        <Icon name='keyboard-arrow-left'/>
                    </Button>
                    <Title>{this.I18n.t("generalConsultation")}</Title>
                </Header>
                <Content style={{backgroundColor: '#212121'}}>
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
                            <FormElement element={this.state.formElementGroup.formElements[0]}/>
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