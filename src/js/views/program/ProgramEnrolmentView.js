import {View, StyleSheet} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import AppHeader from "../common/AppHeader";
import IndividualProfile from "../common/IndividualProfile";
import Path from "../../framework/routing/Path";
import {Content, Grid, Row, Container} from "native-base";
import themes from "../primitives/themes";

@Path('/ProgramEnrolmentView')
class ProgramEnrolmentView extends AbstractComponent {
    static propTypes = {
        params: React.PropTypes.object.isRequired
    };

    viewName() {
        return "ProgramEnrolmentView";
    }

    constructor(props, context) {
        super(props, context);
    }

    render() {
        return (<Container theme={themes}>
            <Content>
                <AppHeader titleKey="enrol"/>
                <Grid style={{marginLeft: 10, marginRight: 10}}>
                    <Row style={{height: 263}}>
                        <IndividualProfile landingView={false} individual={this.props.params.individual}/>
                    </Row>
                </Grid>
            </Content>
        </Container>);
    }
}

export default ProgramEnrolmentView;