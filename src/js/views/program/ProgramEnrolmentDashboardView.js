import {View, StyleSheet} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import ReducerKeys from "../../reducer";
import themes from "../primitives/themes";
import AppHeader from "../common/AppHeader";
import IndividualProfile from '../common/IndividualProfile';
import {ProgramEnrolmentDashboardActionsNames as Actions} from '../../action/prorgam/ProgramEnrolmentDashboardActions';
import Observations from '../common/Observations';

@Path('/ProgramEnrolmentDashboardView')
class ProgramEnrolmentDashboardView extends AbstractComponent {
    static propTypes = {
        params: React.PropTypes.string.isRequired
    };

    viewName() {
        return "ProgramEnrolmentDashboardView";
    }

    constructor(props, context) {
        super(props, context, ReducerKeys.programEnrolmentDashboard);
    }

    componentWillMount() {
        this.dispatchAction(Actions.ON_LOAD, {enrolmentUUID: this.props.params.enrolmentUUID});
        return super.componentWillMount();
    }

    render() {
        return (
            <Container theme={themes}>
                <Content>
                    <AppHeader title={`${this.state.enrolment.individual.name} - ${this.state.enrolment.program.name}`}/>
                    <IndividualProfile individual={this.state.enrolment.individual} landingView={true}/>
                    <View style={{flexDirection: 'column'}}>
                        <Text>{this.state.enrolment.program.name}</Text>
                        <View>
                            <Text>{this.I18n.t('enrolmentDate')}</Text>
                            <Text>{this.state.enrolment.program.name}</Text>
                        </View>
                        <Text>{this.I18n.t('enrolmentAttributes')}</Text>
                        <Observations observations={this.state.enrolment.observations} encounterNumber={0}/>
                        {this.state.encounters.forEach((encounter) => {
                            <View>
                                <Text>{this.I18n.t('enrolmentAttributes')}</Text>
                                <Observations observations={encounter.observations} encounterNumber={0}/>
                            </View>
                        })}
                    </View>
                </Content>
            </Container>
        );
    }
}

export default ProgramEnrolmentDashboardView;