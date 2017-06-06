import React from "react";
import AbstractComponent from "../framework/view/AbstractComponent";
import Path, {PathRoot} from "../framework/routing/Path";
import IndividualSearchView from "./individual/IndividualSearchView";
import MenuView from "./MenuView";
import {Container, Content, Tabs} from "native-base";
import themes from "./primitives/themes";
import Playground from "./Playground";
import ChecklistView from "./program/ChecklistView";
import ProgramEnrolmentDashboardView from "./program/ProgramEnrolmentDashboardView";
import TypedTransition from "../framework/routing/TypedTransition";

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

    render() {
        return (
            <Container theme={themes}>
                <Content style={{backgroundColor: '#fff'}}>
                    <Tabs>
                        {/*<ProgramEnrolmentDashboardView individualUUID="b5d9fd15-8a87-47f0-88ce-0551c6884d0a" tabLabel='Foo'/>*/}
                        <IndividualSearchView tabLabel='Home'/>
                        <MenuView tabLabel='Menu'/>
                        {/*<Playground tabLabel='Play'/>*/}
                    </Tabs>
                </Content>
            </Container>
        );
    }
}

export default LandingView;