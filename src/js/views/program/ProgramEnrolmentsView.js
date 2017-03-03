import {View, StyleSheet} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import ReducerKeys from "../../reducer";
import themes from "../primitives/themes";
import AppHeader from "../common/AppHeader";
import {ProgramEnrolmentsActionsNames as Actions} from "../../action/prorgam/ProgramEnrolmentsActions";
import {Text, Content, Container, List, ListItem} from "native-base";
import moment from "moment";
import TypedTransition from "../../framework/routing/TypedTransition";
import ProgramEnrolmentDashboardView from "./ProgramEnrolmentDashboardView";
import DGS from '../primitives/DynamicGlobalStyles';
import Separator from '../primitives/Separator';

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

    renderRow(programEnrolment) {
        return (<ListItem style={{flexDirection: 'row'}}>
            <Text style={{flex: 1}}>{moment(programEnrolment.enrolmentDateTime).format('DD-MM-YYYY')}</Text>
            <Text style={{flex: 1}}>{programEnrolment.individual.name}</Text>
            <Text style={{flex: 1}} onPress={() => TypedTransition.from(this).with({enrolmentUUID: programEnrolment.uuid}).to(ProgramEnrolmentDashboardView)}>{programEnrolment.individual.lowestAddressLevel.name}</Text>
        </ListItem>);
    }

    render() {
        return (
            <Container theme={themes}>
                <Content>
                    <AppHeader title={`${this.I18n.t('allEnrolmentsInProgram')}: ${this.state.programName}`}/>
                    <View style={{paddingHorizontal: DGS.resizeWidth(12.5), marginTop: DGS.resizeHeight(24)}}>
                        <View style={{flexDirection: 'row'}}>
                            <Text style={{flex: 1}}>{this.I18n.t('enrolledOn')}</Text>
                            <Text style={{flex: 1}}>{this.I18n.t('name')}</Text>
                            <Text style={{flex: 1}}>{this.I18n.t('lowestAddressLevel')}</Text>
                        </View>
                        <View style={{marginTop: DGS.resizeHeight(24)}}>
                            <Separator/>
                        </View>
                        <List primaryText={''} dataArray={this.state.enrolments} renderRow={(programEnnrolment) => this.renderRow(programEnnrolment)}/>
                    </View>
                </Content>
            </Container>
        );
    }
}

export default ProgramEnrolmentsView;