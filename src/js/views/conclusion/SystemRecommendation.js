import MessageService from "../../service/MessageService";
import AbstractComponent from '../../framework/view/AbstractComponent';
import React, {Component} from 'react';
import Path from "../../framework/routing/Path";
import themes from "../primitives/themes";
import {
    Text, Button, Content, Grid, Col, Row, Container, Header, Title, Icon,
    List, ListItem, Radio
} from "native-base";
import {GlobalStyles} from '../primitives/GlobalStyles';
import TypedTransition from "../../framework/routing/TypedTransition";
import Individual from "../../models/Individual";

@Path('/SystemRecommendationView')
class SystemRecommendationView extends AbstractComponent {
    static propTypes = {
        params: React.PropTypes.object.isRequired
    };

    viewName() {
        return "SystemRecommendationView";
    }

    constructor(props, context) {
        super(props, context);
        this.I18n = this.context.getService(MessageService).getI18n();
    }

    next() {
        TypedTransition.from(this).to(IndividualEncounterView);
    }

    previous() {
        TypedTransition.from(this).goBack();
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
                    <Title>{this.props.params.individual.name}</Title>
                </Header>
                <Content>
                    <Grid>
                        <Row style={{backgroundColor: '#f7f7f7', paddingLeft: 24, paddingRight: 24, paddingTop:12, paddingBottom:12, height: 74}}>
                            <Grid>
                                <Row style={{height: 24}}>
                                    <Col><Text style={GlobalStyles.formElementLabel}>{this.props.params.individual.name}</Text></Col>
                                    <Col style={{width: 100}}><Text style={GlobalStyles.formElementLabel}>{this.props.params.individual.lowestAddressLevel.title}</Text></Col>
                                </Row>
                                <Row style={{height: 24}}>
                                    <Col><Text style={{fontSize:14}}>{this.props.params.individual.gender.name} | {Individual.getDisplayAge(this.props.params.individual)}</Text></Col>
                                    <Col style={{width: 100}}></Col>
                                </Row>
                            </Grid>
                        </Row>
                        <Row style={{paddingLeft: 24, paddingRight: 24, paddingTop:12, paddingBottom:12}}>
                            <Grid>
                                <Row style={{backgroundColor: '#f7f7f7', paddingTop: 19, paddingBottom: 19, height:77}}>
                                    <Col style={{width: 50, marginLeft:20, marginRight:20}}>
                                        <Icon style={{fontSize: 50}} name="local-shipping"/></Col>
                                    <Col>
                                        <Text style={{fontSize: 14}}>Please ask the patient to visit the <Text style={{fontWeight: 'bold', fontSize: 14}}>Hospital</Text>. Further tests need to be conducted
                                        </Text>
                                    </Col>
                                </Row>
                            </Grid>
                        </Row>
                        <Row style={{paddingLeft: 24, paddingRight: 24, marginTop: 30}}>
                            <Button primary
                                    style={{flex:0.5, backgroundColor: '#e0e0e0'}}
                                    textStyle={{color: '#212121'}} onPress={() => this.previous()}>
                                PREVIOUS
                            </Button>

                            <Button primary style={{flex:0.5, marginLeft: 8}} onPress={() => this.next()}>SAVE</Button>
                        </Row>
                    </Grid>
                </Content>
            </Container>
        );
    }
}

export default SystemRecommendationView;

