import React from "react";
import AbstractComponent from "../framework/view/AbstractComponent";
import Path, {PathRoot} from "../framework/routing/Path";
import IndividualSearchView from "./individual/IndividualSearchView";
import MenuView from "./MenuView";
import {Container, Content, Tabs} from "native-base";
import themes from "./primitives/themes";
import Playground from "./Playground";
import ChecklistView from "./program/ChecklistView";

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
                        {/*<ChecklistView enrolmentUUID={'52763bfb-b6f1-46ca-801f-0eb2829f3e95'}/>*/}
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