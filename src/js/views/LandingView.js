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
                        {/*<ChecklistView enrolmentUUID={'2f9b62b3-d535-4e8e-bdfe-9afb37bb1285'}/>*/}
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