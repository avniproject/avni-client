import AbstractComponent from "../../framework/view/AbstractComponent";
import React, {Component} from "react";
import Path from "../../framework/routing/Path";
import themes from "../primitives/themes";
import IndividualProfile from "../common/IndividualProfile";
import {Text, Button, Content, Grid, Col, Row, Container, Header, Title, Icon} from "native-base";
import TypedTransition from "../../framework/routing/TypedTransition";
import IndividualEncounterView from "../individual/IndividualEncounterView";
import {Actions} from '../../action/individual/EncounterRecommendationActions';
import ReducerKeys from "../../reducer";
import WizardButtons from '../common/WizardButtons';
import RuleEvaluationService from "../../service/RuleEvaluationService";

@Path('/SystemRecommendationView')
class SystemRecommendationView extends AbstractComponent {
    static propTypes = {
        params: React.PropTypes.object.isRequired
    };

    viewName() {
        return "SystemRecommendationView";
    }

    constructor(props, context) {
        super(props, context, ReducerKeys.encounterRecommendation);
    }

    next() {
        TypedTransition.from(this).to(IndividualEncounterView);
    }

    previous() {
        TypedTransition.from(this).goBack();
    }

    componentWillMount() {
        const validationResult = this.context.getService(RuleEvaluationService).validateEncounter(this.props.params.encounter);
        this.dispatchAction(Actions.ON_LOAD, validationResult);
        return super.componentWillMount();
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
                            <IndividualProfile landingView={false} individual={this.props.params.individual}/>
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
                        <WizardButtons previous={{func: () => this.previous(), visible: true}}
                                       next={{func: () => this.next(), visible: false, label: this.I18n.t('save')}}/>
                    </Grid>
                </Content>
            </Container>
        );
    }
}

export default SystemRecommendationView;

