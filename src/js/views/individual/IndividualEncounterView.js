import AbstractComponent from "../../framework/view/AbstractComponent";
import React, {Component} from "react";
import Path from "../../framework/routing/Path";
import themes from "../primitives/themes";
import {Button, Content, Grid, Row, Container} from "native-base";
import TypedTransition from "../../framework/routing/TypedTransition";
import SystemRecommendationView from "../conclusion/SystemRecommendation";
import IndividualProfile from "../common/IndividualProfile";
import FormElementGroup from "../form/FormElementGroup";
import {Actions} from "../../action/individual/EncounterActions";
import ReducerKeys from "../../reducer";
import AppHeader from "../common/AppHeader";
import _ from 'lodash';
import WizardButtons from '../common/WizardButtons';

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

    next() {
        const nextFormElementGroup = this.props.params.formElementGroup.next();
        if (_.isNil(nextFormElementGroup))
            TypedTransition.from(this).with({individual: this.props.params.individual, encounter: this.props.params.encounter}).to(SystemRecommendationView);
        else
            TypedTransition.from(this).with({
                individual: this.props.params.individual,
                encounter: this.props.params.encounter,
                formElementGroup: nextFormElementGroup
            }).to(IndividualEncounterView);
    }

    previous() {
        TypedTransition.from(this).goBack();
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
                        <FormElementGroup encounter={this.props.params.encounter} group={this.props.params.formElementGroup}/>
                        <WizardButtons previous={{func: () => this.previous(), visible: this.props.params.formElementGroup.displayOrder !== 1}}
                                       next={{func: () => this.next(), visible: !this.props.params.formElementGroup.isLast}}/>
                    </Grid>
                </Content>
            </Container>
        );
    }
}

export default IndividualEncounterView;
