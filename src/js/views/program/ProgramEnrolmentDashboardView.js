import {View, StyleSheet} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import Reducers from "../../reducer";
import themes from "../primitives/themes";
import AppHeader from "../common/AppHeader";
import IndividualProfile from "../common/IndividualProfile";
import {
    ProgramEnrolmentDashboardActionsNames as Actions,
    EncounterTypeChoiceActionNames,
    ProgramEncounterTypeChoiceActionNames
} from "../../action/program/ProgramEnrolmentDashboardActions";
import Observations from "../common/Observations";
import {Text, Content, Container, Button, Card} from "native-base";
import ProgramList from "./ProgramList";
import moment from "moment";
import PreviousEncounters from "../common/PreviousEncounters";
import Colors from "../primitives/Colors";
import DGS from "../primitives/DynamicGlobalStyles";
import CHSNavigator from "../../utility/CHSNavigator";
import EntityTypeSelector from "../common/EntityTypeSelector";
import ContextAction from "../viewmodel/ContextAction";
import ObservationsSectionTitle from '../common/ObservationsSectionTitle';
import Fonts from '../primitives/Fonts';

@Path('/ProgramEnrolmentDashboardView')
class ProgramEnrolmentDashboardView extends AbstractComponent {
    static propTypes = {
        params: React.PropTypes.object.isRequired
    };

    viewName() {
        return 'ProgramEnrolmentDashboardView';
    }

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.programEnrolmentDashboard);
    }

    componentWillMount() {
        this.dispatchAction(Actions.ON_LOAD, {enrolmentUUID: this.props.params.enrolmentUUID, individualUUID: this.props.params.individualUUID});
        return super.componentWillMount();
    }

    componentWillReceiveProps() {
        if (this.state.possibleExternalStateChange) {
            this.dispatchAction(Actions.ON_LOAD, {enrolmentUUID: this.props.params.enrolmentUUID, individualUUID: this.props.params.individualUUID});
        }
    }

    editEnrolment() {
        this.dispatchAction(Actions.ON_EDIT_ENROLMENT, {
            enrolmentUUID: this.state.enrolment.uuid, cb: (enrolment) => {
                CHSNavigator.navigateToProgramEnrolmentView(this, enrolment);
            }
        });
    }

    exitProgram() {
        CHSNavigator.navigateToExitProgram(this, this.state.enrolment);
    }

    programSelect(program) {
        this.dispatchAction(Actions.ON_PROGRAM_CHANGE, {program: program});
    }

    startProgramEncounter() {
        this.dispatchAction(ProgramEncounterTypeChoiceActionNames.LAUNCH_CHOOSE_ENTITY_TYPE);
    }

    startEncounter() {
        this.dispatchAction(Reducers.STATE_CHANGE_POSSIBLE_EXTERNALLY);
        this.dispatchAction(EncounterTypeChoiceActionNames.LAUNCH_CHOOSE_ENTITY_TYPE);
    }

    openChecklist() {
        CHSNavigator.navigateToChecklistView(this, this.state.enrolment.uuid);
    }

    render() {
        console.log('ProgramEnrolmentDashboardView.render');
        var enrolments = _.reverse(_.sortBy(this.state.enrolment.individual.enrolments, (enrolment) => enrolment.enrolmentDateTime));
        const encounterTypeState = this.state.encounterTypeState;
        const programEncounterTypeState = this.state.programEncounterTypeState;
        const contextActions = [new ContextAction('edit', () => this.editEnrolment())];
        if (this.state.enrolment.isActive)
            contextActions.push(new ContextAction('exitProgram', () => this.exitProgram()));

        return (
            <Container theme={themes} style={{backgroundColor: Colors.BlackBackground}}>
                <Content>
                    <EntityTypeSelector actions={ProgramEncounterTypeChoiceActionNames} flowState={programEncounterTypeState.flowState}
                                        entityTypes={programEncounterTypeState.entityTypes} labelKey='followupTypes'
                                        selectedEntityType={programEncounterTypeState.entity.encounterType}
                                        onEntityTypeSelectionConfirmed={(entityTypeSelectorState) => CHSNavigator.navigateToProgramEncounterView(this, entityTypeSelectorState.entity)}/>
                    <EntityTypeSelector actions={EncounterTypeChoiceActionNames} flowState={encounterTypeState.flowState} entityTypes={encounterTypeState.entityTypes}
                                        labelKey='followupTypes' selectedEntityType={encounterTypeState.entity.encounterType}
                                        onEntityTypeSelectionConfirmed={(entityTypeSelectorState) => CHSNavigator.navigateToIndividualEncounterLandingView(this, this.state.enrolment.individual.uuid, entityTypeSelectorState.entity)}/>
                    <View style={{backgroundColor: Colors.BlackBackground}}>
                        <AppHeader title={`${this.state.enrolment.individual.name}`}/>
                        <IndividualProfile individual={this.state.enrolment.individual} viewContext={IndividualProfile.viewContext.Program}/>
                        <Card style={{flexDirection: 'column', marginHorizontal: DGS.resizeWidth(13), borderRadius: 5}}>
                            <View style={{flexDirection: 'column', paddingHorizontal: DGS.resizeWidth(12), marginTop: DGS.resizeHeight(18)}}>
                                <Text style={{fontSize: Fonts.Large, color: Colors.InputNormal}}>{this.I18n.t('programList')}</Text>
                                <View style={{flexDirection: 'row'}}>
                                    <View style={{flex: 1, justifyContent: 'flex-start'}}>
                                        <ProgramList enrolments={enrolments}
                                                     selectedEnrolment={this.state.enrolment} onProgramSelect={(program) => this.programSelect(program)}/>
                                    </View>
                                    <View style={{flexDirection: 'column', flex: 1, justifyContent: 'flex-end', marginTop: DGS.resizeHeight(9)}}>
                                        {this.state.enrolment.isActive ?
                                            <Button block
                                                    style={{height: DGS.resizeHeight(36), marginBottom: DGS.resizeHeight(8), backgroundColor: Colors.ActionButtonColor}}
                                                    textStyle={{color: 'white'}}
                                                    onPress={() => this.startProgramEncounter()}>{this.I18n.t('startProgramVisit')}</Button> :
                                            <View/>}
                                        {this.state.enrolment.hasChecklist ?
                                            <Button block
                                                    style={{height: DGS.resizeHeight(36), marginBottom: DGS.resizeHeight(8), backgroundColor: Colors.ActionButtonColor}}
                                                    textStyle={{color: 'white'}} onPress={() => this.openChecklist()}>{this.I18n.t('openChecklist')}</Button> : <View/>}
                                        <Button block style={{height: DGS.resizeHeight(36), backgroundColor: Colors.SecondaryActionButtonColor}}
                                                textStyle={{color: Colors.BlackBackground}}
                                                onPress={() => this.startEncounter()}>{this.I18n.t('startGeneralVisit')}</Button>
                                    </View>
                                </View>
                            </View>
                            {enrolments.length === 0 ? <View/> :
                                <View style={{marginTop: DGS.resizeHeight(35)}}>
                                    <View style={{paddingHorizontal: DGS.resizeWidth(13), backgroundColor: Colors.GreyContentBackground}}>
                                        <ObservationsSectionTitle contextActions={contextActions} title={this.getEnrolmentHeaderMessage(this.state.enrolment)}/>
                                        <View style={{
                                            marginVertical: DGS.resizeHeight(8)
                                        }}>
                                            <Observations observations={this.state.enrolment.observations}/>
                                        </View>
                                    </View>
                                    <PreviousEncounters encounters={this.state.enrolment.encounters}/>
                                </View>}
                        </Card>
                    </View>
                </Content>
            </Container>
        );
    }

    getEnrolmentHeaderMessage(enrolment) {
        return `${this.I18n.t("enrolledOn")} ${moment(enrolment.enrolmentDateTime).format("DD-MMM-YYYY")}`;
    }
}

export default ProgramEnrolmentDashboardView;