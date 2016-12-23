import MessageService from "../../service/MessageService";
import AbstractComponent from '../../framework/view/AbstractComponent';
import React, {Component} from 'react';
import Path from "../../framework/routing/Path";
import themes from "../primitives/themes";
import {
    Text, Button, Content, Grid, Col, Row, Container, Header, Title, Icon,
    List, ListItem, Radio, View
} from "native-base";
import {GlobalStyles} from '../primitives/GlobalStyles';
import TypedTransition from "../../framework/routing/TypedTransition";
import SystemRecommendationView from "../conclusion/SystemRecommendation"

@Path('/IndividualEncounterView')
class IndividualEncounterView extends AbstractComponent {
    static propTypes = {
        params: React.PropTypes.object.isRequired
    };

    viewName() {
        return "IndividualEncounterView";
    }

    constructor(props, context) {
        super(props, context);
        this.I18n = this.context.getService(MessageService).getI18n();
    }

    next() {
        TypedTransition.from(this).to(SystemRecommendationView);
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
                    <Title>Ramesh KP</Title>
                </Header>
                <Content>
                    <Grid>
                        <Row style={{
                            backgroundColor: '#f7f7f7',
                            paddingLeft: 24,
                            paddingRight: 24,
                            paddingTop: 12,
                            paddingBottom: 12,
                            height: 74
                        }}>
                            <Grid>
                                <Row style={{height: 24}}>
                                    <Col><Text style={GlobalStyles.formElementLabel}>Ramesh KP</Text></Col>
                                    <Col style={{width: 100}}><Text
                                        style={GlobalStyles.formElementLabel}>Gulbarga</Text></Col>
                                </Row>
                                <Row style={{height: 24}}>
                                    <Col><Text style={{fontSize: 14}}>Male | 40 years</Text></Col>
                                    <Col style={{width: 100}}></Col>
                                </Row>
                            </Grid>
                        </Row>
                        <Row style={{paddingLeft: 24, paddingRight: 24, paddingTop: 12, paddingBottom: 12}}>
                            <Grid>
                                <Row>
                                    <Grid>
                                        <Row><Text style={GlobalStyles.formElementLabel}>Pallor</Text></Row>
                                        <Row>
                                            <Grid>
                                                <Row>
                                                    <Radio selected={false}/>
                                                    <Text style={GlobalStyles.formElementLabel}>PRESENT</Text>
                                                </Row>
                                            </Grid>
                                            <Grid><Row><Radio selected={false}/>
                                                <Text style={GlobalStyles.formElementLabel}>ABSENT</Text>
                                            </Row></Grid></Row>
                                    </Grid>
                                </Row>
                                <Row></Row>
                                <Row></Row>
                                <Row></Row>
                            </Grid>
                        </Row>
                        <Row style={{paddingLeft: 24, paddingRight: 24, marginTop: 30}}>
                            <Button primary
                                    style={{flex: 0.5, backgroundColor: '#e0e0e0'}}
                                    textStyle={{color: '#212121'}}>
                                PREVIOUS
                            </Button>

                            <Button primary style={{flex: 0.5, marginLeft: 8}} onPress={() => this.next()}>NEXT</Button>
                        </Row>
                    </Grid>
                </Content>
            </Container>
        );
    }
}

export default IndividualEncounterView;
