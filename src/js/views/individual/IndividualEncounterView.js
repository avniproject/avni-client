import AbstractComponent from '../../framework/view/AbstractComponent';
import React, {Component} from 'react';
import Path from "../../framework/routing/Path";
import themes from "../primitives/themes";
import {Text, Button, Content, Grid, Row, Container, Header, Title, Icon, Radio} from "native-base";
import DGS from '../primitives/DynamicGlobalStyles';
import TypedTransition from "../../framework/routing/TypedTransition";
import SystemRecommendationView from "../conclusion/SystemRecommendation"
import IndividualProfile from "../common/IndividualProfile"
import FormElementGroup from '../form/FormElementGroup';
import {Actions} from '../../action/individual/EncounterActions';
import ReducerKeys from "../../reducer";
import AppHeader from '../common/AppHeader';

@Path('/IndividualEncounterView')
class IndividualEncounterView extends AbstractComponent {
    static propTypes = {
        params: React.PropTypes.object.isRequired
    };

    viewName() {
        return "IndividualEncounterView";
    }

    constructor(props, context) {
        super(props, context, ReducerKeys.encounter);
    }

    componentWillMount() {
        this.dispatchAction(Actions.ON_LOAD, this.props.params.formElementGroup);
        return super.componentWillMount();
    }

    next() {
        this.dispatchAction(Actions.NEXT, (nextFormElementGroup) => {
            if (_.isNil(nextFormElementGroup))
                TypedTransition.from(this).with({individual: this.props.params.individual, encounter: this.props.params.encounter}).to(SystemRecommendationView);
            else
                TypedTransition.from(this).with({
                    individual: this.props.params.individual,
                    encounter: this.props.params.encounter,
                    formElementGroup: nextFormElementGroup
                }).to(IndividualEncounterView);
        });
    }

    previous() {
        this.dispatchAction(Actions.PREVIOUS, {
            cb: () => TypedTransition.from(this).goBack()
        });
    }

    render() {
        return (
            <Container theme={themes}>
                <Content>
                    <AppHeader title={this.props.params.individual.name}/>
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
                        <FormElementGroup encounter={this.props.params.encounter} group={this.props.params.formGroup}/>
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
