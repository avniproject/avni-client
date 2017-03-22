import {View, StyleSheet} from 'react-native';
import React, {Component} from 'react';
import AbstractComponent from '../../framework/view/AbstractComponent';
import Path from "../../framework/routing/Path";
import _ from "lodash";
import ReducerKeys from "../../reducer";
import themes from "../primitives/themes";
import AppHeader from "../common/AppHeader";

@Path('/ProgramEncounterView')
class ProgramEncounterView extends AbstractComponent {
    static propTypes = {};

    viewName() {
        return ProgramEncounterView.name;
    }

    constructor(props, context) {
        super(props, context, ReducerKeys.programEncounter);
    }

    render() {
        return (
            <Container theme={themes}>
                <Content>
                    <AppHeader title={}/>
                </Content>
            </Container>
        );
    }
}

export default ProgramEncounterView;