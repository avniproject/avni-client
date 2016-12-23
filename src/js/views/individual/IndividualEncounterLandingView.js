import {View, StyleSheet, ScrollView, TextInput} from 'react-native';
import React, {Component} from 'react';
import MessageService from "../../service/MessageService";
import AbstractComponent from '../../framework/view/AbstractComponent';
import Path from "../../framework/routing/Path";
import themes from "../primitives/themes";
import {
    Text, Button, Content, CheckBox, Grid, Col, Row, Container, Header, Title, Icon, InputGroup,
    Input, Thumbnail
} from "native-base";
import {GlobalStyles} from '../primitives/GlobalStyles';
import TypedTransition from "../../framework/routing/TypedTransition";
import IndividualEncounterView from "./IndividualEncounterView"

@Path('/IndividualEncounterLandingView')
class IndividualEncounterLandingView extends AbstractComponent {
    static propTypes = {
        params: React.PropTypes.object.isRequired
    };

    viewName() {
        return "IndividualEncounterLandingView";
    }

    constructor(props, context) {
        super(props, context);
        this.I18n = this.context.getService(MessageService).getI18n();
    }

    next() {
        TypedTransition.from(this).to(IndividualEncounterView);
    }



    render() {
        return (
            <Container theme={themes}>
                <Header style={{backgroundColor: '#212121'}}>
                    <Button transparent onPress={() => {
                        TypedTransition.from(this).goBack()
                    }}>
                        <Icon name='keyboard-arrow-left'/>
                    </Button>
                    <Title>{this.I18n.t("patientProfile")}</Title>
                </Header>
                <Content style={{backgroundColor: '#212121'}}>
                    <Grid style={{marginLeft: 10, marginRight: 10}}>
                        <Row style={{height: 263}}>
                            <Grid>
                                <Row style={{justifyContent: 'center', height:131}}>
                                    <Thumbnail size={75}
                                               style={{borderWidth: 2, borderColor: '#ffffff', margin : 28}}
                                               source={require("../../../../android/app/src/main/res/mipmap-mdpi/arvind_kejriwal.jpg")}/>
                                </Row>
                                <Row style={{justifyContent: 'center', height:30}}><Text style={{fontSize: 16, color: '#fff', justifyContent: 'center'}}>Ramesh KP | CH134523</Text></Row>
                                <Row style={{justifyContent: 'center', height:30}}>
                                    <Text style={{textAlignVertical: 'top', fontSize: 14, color: '#fff', justifyContent: 'center'}}>Male, 40 years | GULBARGA
                                    </Text>
                                </Row>
                                <Row style={{justifyContent: 'center', height: 40}}>
                                    <Button bordered style={{marginLeft: 8, height: 26, justifyContent: 'center'}}><Icon name="mode-edit" />Edit Profile</Button>
                                    <Button bordered style={{marginLeft: 8, height: 26, justifyContent: 'center'}}><Icon name="add" />Enroll Patient</Button>
                                </Row>
                            </Grid>
                        </Row>
                        <Row>
                            <Grid style={{backgroundColor: '#ffffff', paddingLeft:10, paddingRight: 10}}>
                            <Row style={{backgroundColor: '#ffffff'}}>
                                <Text style={GlobalStyles.formElementLabel}>{this.I18n.t("date")}</Text>
                            </Row>
                            <Row>
                                <InputGroup style={{flex: 1}} borderType='underline'>
                                    <Input/>
                                </InputGroup>
                            </Row>
                            <Row style={{backgroundColor: '#ffffff', borderStyle: 'dotted', marginTop: 10, marginBottom: 10}}>
                                <Text style={GlobalStyles.formElementLabel}>Complaint</Text>
                            </Row>
                            <Row style={{
                                padding: 28,
                                backgroundColor: '#ffffff',
                                height: 360,
                                borderWidth: 1
                            }}>
                                <Col>
                                    {['Fever', 'Chloroquine Resistant', 'Bodyache', 'Headache', 'Giddyness'
                                        , 'Diarrhoea', 'Wound', 'Ringworm'].map(
                                        function (item) {
                                            return <Row>
                                                <CheckBox/>
                                                <Text style={{fontSize: 16, marginLeft:11}}>{item}</Text>
                                            </Row>;
                                        })}
                                </Col>
                                <Col>
                                    {['Vomiting', 'Cough', 'Cold', 'Acidity', 'Abdominal Pain', 'Pregnancy'
                                        , 'Scabies', 'Boils'].map(
                                        function (item) {
                                            return <Row><CheckBox/>
                                                <Text style={{fontSize: 16, marginLeft:11}}>{item}</Text>
                                            </Row>;
                                        })}
                                </Col>
                            </Row>
                            <Row style={{marginTop: 30, marginBottom:30}}>
                                <Button primary
                                        style={{flex:0.5, backgroundColor: '#e0e0e0'}}
                                        textStyle={{color: '#212121'}}>
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