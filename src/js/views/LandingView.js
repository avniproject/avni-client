import React from "react";
import AbstractComponent from "../framework/view/AbstractComponent";
import Path, {PathRoot} from "../framework/routing/Path";
import IndividualSearchView from "./individual/IndividualSearchView";
import MenuView from "./MenuView";
import {Container, Content, Tabs} from "native-base";
import themes from "./primitives/themes";
import Playground from "./Playground";
import Encounter from "../models/Encounter";
import EncounterType from "../models/EncounterType";

@Path('/landingView')
@PathRoot
class LandingView extends AbstractComponent {
    static propTypes = {};

    constructor(props, context) {
        super(props, context);
    }

    viewName() {
        return "LandingView";
    }

    createEncounter() {
        const encounter = Encounter.create();
        encounter.encounterType = new EncounterType();
        encounter.encounterType.uuid = '6aa5d8ae-5799-4499-9708-2657ddc67df2';
        encounter.encounterType.name = 'Outpatient';
        return encounter;
    }

    render() {
        return (
            <Container theme={themes}>
                <Content style={{backgroundColor: '#fff'}}>
                    <Tabs>
                        {/*<IndividualEncounterLandingView tabLabel='Play2' individualUUID='925f4909-6639-42e2-b97d-eac431f8497f' encounter={this.createEncounter()}/>*/}
                        <IndividualSearchView tabLabel='Home'/>
                        <MenuView tabLabel='Menu'/>
                        <Playground tabLabel='Play'/>
                    </Tabs>
                </Content>
            </Container>
        );
    }
}

export default LandingView;