import {View, StyleSheet} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import ReducerKeys from "../../reducer";
import themes from "../primitives/themes";
import AppHeader from "../common/AppHeader";
import {ProgramEnrolmentsActionsNames as Actions} from "../../action/prorgam/ProgramEnrolmentsActions";
import {Content, Container} from "native-base";
import moment from "moment";
import TypedTransition from "../../framework/routing/TypedTransition";
import ProgramEnrolmentDashboardView from "./ProgramEnrolmentDashboardView";
import TabularListView from "../common/TabularListView";

@Path('/ProgramEnrolmentsView')
class ProgramEnrolmentsView extends AbstractComponent {
    static propTypes = {
        params: React.PropTypes.object.isRequired
    };

    viewName() {
        return "ProgramEnrolmentsView";
    }

    constructor(props, context) {
        super(props, context, ReducerKeys.programEnrolments);
    }

    componentWillMount() {
        this.dispatchAction(Actions.ON_LOAD, {programUUID: this.props.params.programUUID});
        return super.componentWillMount();
    }

    static displayItemsForProgramEnrolment(programEnrolment) {
        const displayItems = [];
        displayItems.push(moment(programEnrolment.enrolmentDateTime).format('DD-MM-YYYY'));
        displayItems.push(programEnrolment.individual.name);
        displayItems.push(programEnrolment.individual.lowestAddressLevel.name);
        return displayItems;
    }

    render() {
        return (
            <Container theme={themes}>
                <Content>
                    <AppHeader title={`${this.I18n.t('allEnrolmentsInProgram')}: ${this.state.programName}`}/>
                    <TabularListView data={this.state.enrolments}
                                     tableTitle={this.I18n.t('noEnrolments')}
                                     getRow={ProgramEnrolmentsView.displayItemsForProgramEnrolment}
                                     handleClick={(rowEntity) => TypedTransition.from(this).with({enrolmentUUID: rowEntity.uuid}).to(ProgramEnrolmentDashboardView)}
                                     headerTitleKeys={['enrolledOn', 'name', 'lowestAddressLevel']}
                    />
                </Content>
            </Container>
        );
    }
}

export default ProgramEnrolmentsView;