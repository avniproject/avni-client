import {View} from "react-native";
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import Reducers from "../../reducer";
import AppHeader from "../common/AppHeader";
import IndividualProfile from "../common/IndividualProfile";
import {
    ProgramEnrolmentDashboardActionsNames as Actions,
    EncounterTypeChoiceActionNames,
    ProgramEncounterTypeChoiceActionNames
} from "../../action/program/ProgramEnrolmentDashboardActions";
import Observations from "../common/Observations";
import {Text, Card} from "native-base";
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
import General from "../../utility/General";
import ProgramActionsView from './ProgramActionsView';
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
import Styles from "../primitives/Styles";

@Path('/ProgramEnrolmentDashboardView')
class ProgramEnrolmentDashboardView extends AbstractComponent {
    static propTypes = {
        enrolmentUUID: React.PropTypes.string,
        individualUUID: React.PropTypes.string.isRequired
    };

    viewName() {
        return 'ProgramEnrolmentDashboardView';
    }

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.programEnrolmentDashboard);
    }

    componentWillMount() {
        this.dispatchOnLoad();
        return super.componentWillMount();
    }

    dispatchOnLoad() {
        this.dispatchAction(Actions.ON_LOAD, this.props);
    }

    componentWillReceiveProps() {
        if (this.state.possibleExternalStateChange) {
            this.dispatchOnLoad();
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

    render() {
        General.logDebug(this.viewName(), 'render');
        General.logDebug(this.viewName(), this.state.enrolment.enrolmentDateTime);
        var enrolments = _.reverse(_.sortBy(this.state.enrolment.individual.enrolments, (enrolment) => enrolment.enrolmentDateTime));
        const encounterTypeState = this.state.encounterTypeState;
        const programEncounterTypeState = this.state.programEncounterTypeState;
        const contextActions = [new ContextAction('edit', () => this.editEnrolment())];
        if (this.state.enrolment.isActive) {
            contextActions.push(new ContextAction('exitProgram', () => this.exitProgram()));
        }
        const dashboardButtons = this.state.dashboardButtons || [];

        return (
            <CHSContainer theme={{iconFamily: 'MaterialIcons'}}>
                <CHSContent style={{backgroundColor: Styles.defaultBackground}}>
                    <EntityTypeSelector actions={ProgramEncounterTypeChoiceActionNames} flowState={programEncounterTypeState.flowState}
                                        entityTypes={programEncounterTypeState.entityTypes} labelKey='followupTypes'
                                        selectedEntityType={programEncounterTypeState.entity.encounterType}
                                        onEntityTypeSelectionConfirmed={(entityTypeSelectorState) => CHSNavigator.navigateToProgramEncounterView(this, entityTypeSelectorState.entity)}/>
                    <EntityTypeSelector actions={EncounterTypeChoiceActionNames} flowState={encounterTypeState.flowState} entityTypes={encounterTypeState.entityTypes}
                                        labelKey='followupTypes' selectedEntityType={encounterTypeState.entity.encounterType}
                                        onEntityTypeSelectionConfirmed={(entityTypeSelectorState) => CHSNavigator.navigateToIndividualEncounterLandingView(this, this.state.enrolment.individual.uuid, entityTypeSelectorState.entity)}/>
                    <View>
                        <AppHeader title={this.I18n.t('individualDashboard')}/>
                        <IndividualProfile style={{marginHorizontal: 16}} individual={this.state.enrolment.individual} viewContext={IndividualProfile.viewContext.Program}/>
                        <Card style={{ flexDirection: 'column', borderRadius: 5, marginHorizontal: 16, backgroundColor: Styles.whiteColor}}>
                            <View style={{marginHorizontal: 8}}>
                                <Text style={{fontSize: Fonts.Large, color: Colors.InputNormal}}>{this.I18n.t('programList')}</Text>
                                <View style={{flex: 2, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'stretch'}}>
                                    <View style={{justifyContent: 'flex-start', flex: 1}}>
                                        <ProgramList enrolments={enrolments}
                                                     selectedEnrolment={this.state.enrolment} onProgramSelect={(program) => this.programSelect(program)}/>
                                    </View>
                                    <ProgramActionsView programDashboardButtons={dashboardButtons}
                                                        enrolment={this.state.enrolment}
                                                        onOpenChecklist={() => this.openChecklist()}/>
                                </View>
                            </View>
                            {enrolments.length === 0 ? <View/> :
                                <View style={{marginHorizontal: 8}}>
                                    <View>
                                        <ObservationsSectionTitle contextActions={contextActions} title={this.getEnrolmentHeaderMessage(this.state.enrolment)}/>
                                        <Observations observations={this.state.enrolment.observations} style={{marginVertical: DGS.resizeHeight(8)}}/>
                                    </View>
                                    <PreviousEncounters encounters={this.state.enrolment.encounters}/>
                                </View>}
                        </Card>
                    </View>
                </CHSContent>
            </CHSContainer>
        );
    }

    getEnrolmentHeaderMessage(enrolment) {
        return `${this.I18n.t("enrolledOn")} ${moment(enrolment.enrolmentDateTime).format("DD-MM-YYYY")}`;
    }
}

export default ProgramEnrolmentDashboardView;