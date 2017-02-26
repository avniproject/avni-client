import {View, StyleSheet} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import ReducerKeys from "../../reducer";
import {DashboardActionNames as Actions} from "../../action/prorgam/DashboardActions";
import themes from "../primitives/themes";
import ProgramDashboard from "../program/ProgramDashboard";
import {Content, Container} from "native-base";
import AppHeader from "../common/AppHeader";

@Path('/DashboardView')
class DashboardView extends AbstractComponent {
    static propTypes = {};

    viewName() {
        return "DashboardView";
    }

    componentWillMount() {
        this.dispatchAction(Actions.ON_LOAD);
        return super.componentWillMount();
    }

    constructor(props, context) {
        super(props, context, ReducerKeys.dashboard);
    }

    render() {
        return (
            <Container theme={themes}>
                <Content>
                    <AppHeader title={'dashboard'}/>
                    {this.state.programs.map((programSummary) => {
                        return <ProgramDashboard summary={programSummary}/>;
                    })}
                </Content>
            </Container>
        );
    }
}

export default DashboardView;