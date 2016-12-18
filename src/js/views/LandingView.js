import {View, StyleSheet} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../framework/view/AbstractComponent";
import Path, {PathRoot} from "../framework/routing/Path";
import IndividualSearchView from "./individual/IndividualSearchView";
import MenuView from "./MenuView";
import {Tabs, Container, Content} from "native-base";
import theme from "./primitives/themes";
import Playground from './Playground';

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
            <Container theme={theme}>
                <Content>
                    <Tabs>
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