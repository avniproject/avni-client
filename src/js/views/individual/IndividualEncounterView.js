import AbstractComponent from "../../framework/view/AbstractComponent";
import React, {Component} from "react";
import Path from "../../framework/routing/Path";
import themes from "../primitives/themes";
import {Content, Grid, Row, Container} from "native-base";
import TypedTransition from "../../framework/routing/TypedTransition";
import SystemRecommendationView from "../conclusion/SystemRecommendationView";
import IndividualProfile from "../common/IndividualProfile";
import FormElementGroup from "../form/FormElementGroup";
import {IndividualEncounterViewActions as Actions} from "../../action/individual/EncounterActions";
import ReducerKeys from "../../reducer";
import AppHeader from "../common/AppHeader";
import WizardButtons from "../common/WizardButtons";
import IndividualEncounterLandingView from "./IndividualEncounterLandingView";

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
        this.dispatchAction(Actions.ON_LOAD, {encounter: this.props.params.encounter, formElementGroup: this.props.params.formElementGroup});
        return super.componentWillMount();
    }

    next() {
        this.dispatchAction(Actions.NEXT, {
            cb: (lastPage, encounter, formElementGroup, encounterDecisions) => {
                if (lastPage)
                    TypedTransition.from(this).with({encounter: encounter, previousFormElementGroup: this.state.formElementGroup, encounterDecisions: encounterDecisions}).to(SystemRecommendationView);
                else
                    TypedTransition.from(this).with({encounter: encounter, formElementGroup: formElementGroup}).to(IndividualEncounterView);
            }
        });
    }

    previous() {
        this.dispatchAction(Actions.PREVIOUS, (firstPage) => {
            TypedTransition.from(this).to(firstPage ? IndividualEncounterLandingView : IndividualEncounterView);
        });
    }

    render() {
        console.log('IndividualEncounterView.render');
        return (
            <Container theme={themes}>
                <Content>
                    <AppHeader title={this.state.encounter.individual.name}/>
                    <Grid>
                        <Row style={{
                            backgroundColor: '#f7f7f7',
                            paddingLeft: 24,
                            paddingRight: 24,
                            paddingTop: 12,
                            paddingBottom: 12,
                            height: 74
                        }}>
                            <IndividualProfile landingView={false} individual={this.state.encounter.individual}/>
                        </Row>
                        <FormElementGroup encounter={this.state.encounter} group={this.state.formElementGroup} actions={Actions}/>
                        <WizardButtons previous={{func: () => this.previous(), visible: this.state.formElementGroup.displayOrder !== 1}}
                                       next={{func: () => this.next(), visible: true}}/>
                    </Grid>
                </Content>
            </Container>
        );
    }
}

export default IndividualEncounterView;
