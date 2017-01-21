import MessageService from "../../service/MessageService";
import AbstractComponent from '../../framework/view/AbstractComponent';
import React, {Component} from 'react';
import Path from "../../framework/routing/Path";
import themes from "../primitives/themes";
import {Text, Button, Content, Grid, Row, Container, Header, Title, Icon, Radio} from "native-base";
import DynamicGlobalStyles from '../primitives/DynamicGlobalStyles';
import TypedTransition from "../../framework/routing/TypedTransition";
import SystemRecommendationView from "../conclusion/SystemRecommendation"
import IndividualProfile from "../common/IndividualProfile"

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
        TypedTransition.from(this).with({individual: this.props.params.individual, encounter: this.props.params.encounter}).to(SystemRecommendationView);
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
                        <Row style={{
                            backgroundColor: '#f7f7f7',
                            paddingLeft: 24,
                            paddingRight: 24,
                            paddingTop: 12,
                            paddingBottom: 12,
                            height: 74
                        }}>
                            <IndividualProfile landingView={false} individual={this.props.params.individual}/>
                        </Row>
                        <Row style={{paddingLeft: 24, paddingRight: 24, paddingTop: 12, paddingBottom: 12}}>
                            <Grid>
                                <Row>
                                    <Grid>
                                        <Row><Text style={DynamicGlobalStyles.formElementLabel}>Pallor</Text></Row>
                                        <Row>
                                            <Grid>
                                                <Row>
                                                    <Radio selected={false}/>
                                                    <Text style={DynamicGlobalStyles.formElementLabel}>PRESENT</Text>
                                                </Row>
                                            </Grid>
                                            <Grid><Row><Radio selected={false}/>
                                                <Text style={DynamicGlobalStyles.formElementLabel}>ABSENT</Text>
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
                                    textStyle={{color: '#212121'}} onPress={() => this.previous()}>
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
