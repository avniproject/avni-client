import {View, StyleSheet} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import ReducerKeys from "../../reducer";
import themes from "../primitives/themes";
import AppHeader from "../common/AppHeader";
import IndividualProfile from "../common/IndividualProfile";
import {ProgramEnrolmentDashboardActionsNames as Actions} from "../../action/prorgam/ProgramEnrolmentDashboardActions";
import Observations from "../common/Observations";
import {Text, Content, Container, Button, Card} from "native-base";
import ProgramList from './ProgramList';
import moment from "moment";
import PreviousEncounter from '../common/PreviousEncounter';
import Colors from '../primitives/Colors';
import DGS from '../primitives/DynamicGlobalStyles';
import TypedTransition from "../../framework/routing/TypedTransition";
import ProgramEnrolmentView from "./ProgramEnrolmentView";
import CHSNavigator from "../../utility/CHSNavigator";

@Path('/ProgramEnrolmentDashboardView')
class ProgramEnrolmentDashboardView extends AbstractComponent {
    static propTypes = {
        params: React.PropTypes.object.isRequired
    };

    viewName() {
        return "ProgramEnrolmentDashboardView";
    }

    constructor(props, context) {
        super(props, context, ReducerKeys.programEnrolmentDashboard);
    }

    componentWillMount() {
        this.dispatchAction(Actions.ON_LOAD, {enrolmentUUID: this.props.params.enrolmentUUID, individualUUID: this.props.params.individualUUID});
        return super.componentWillMount();
    }

    editEnrolment() {
        this.dispatchAction(Actions.ON_EDIT_ENROLMENT, {enrolmentUUID: this.state.enrolment.uuid, cb: (enrolment) => {
            console.log(enrolment.observations);
            CHSNavigator.navigateToProgramEnrolmentView(this, enrolment);
        }});
    }

    render() {
        return (
            <Container theme={themes} style={{backgroundColor: Colors.Blackish}}>
                <Content>
                    <AppHeader title={`${this.state.enrolment.individual.name}`}/>
                    <IndividualProfile individual={this.state.enrolment.individual} landingView={true}/>
                    <Card style={{flexDirection: 'column', marginHorizontal: DGS.resizeWidth(13), borderRadius: 5}}>
                        <View style={{flexDirection: 'row', paddingHorizontal: DGS.resizeWidth(12), marginTop: DGS.resizeHeight(18)}}>
                            <View style={{flex: 1, justifyContent: 'flex-start'}}>
                                <ProgramList programs={this.state.enrolment.individual.enrolments.map((enrolment) => enrolment.program)} selectedProgram={this.state.enrolment.program}/>
                            </View>
                            <View style={{flexDirection: 'column', flex: 1, justifyContent: 'flex-end', marginTop: DGS.resizeHeight(21)}}>
                                <Button block style={{height: DGS.resizeHeight(36), marginBottom: DGS.resizeHeight(8), backgroundColor: Colors.ActionButtonColor}} textStyle={{color: 'white'}}>{this.I18n.t('startProgramVisit')}</Button>
                                <Button block style={{height: DGS.resizeHeight(36), backgroundColor: Colors.SecondaryActionButtonColor}} textStyle={{color: Colors.Blackish}}>{this.I18n.t('startGeneralVisit')}</Button>
                            </View>
                        </View>
                        <View style={{backgroundColor: Colors.GreyContentBackground}}>
                            <View style={{flexDirection: 'row'}}>
                                <Text>{this.I18n.t('enrolmentDate')}</Text>
                                <Text>{moment(this.state.enrolment.enrolmentDateTime).format('DD-MMM-YYYY')}</Text>
                                <Button primary onPress={() => this.editEnrolment()}>{this.I18n.t('edit')}</Button>
                            </View>
                            <Text>{this.I18n.t('enrolmentAttributes')}</Text>
                            <Observations observations={this.state.enrolment.observations} encounterNumber={0}/>
                        </View>
                        <PreviousEncounter encounters={this.state.enrolment.encounters} />
                    </Card>
                </Content>
            </Container>
        );
    }
}

export default ProgramEnrolmentDashboardView;