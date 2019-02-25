import {View, ScrollView} from "react-native";
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
import FormMappingService from "../../service/FormMappingService";
import {Form} from 'openchs-models';
import _ from "lodash";

@Path('/ProgramEnrolmentDashboardView')
class ProgramEnrolmentDashboardView extends AbstractComponent {
    static propTypes = {
        enrolmentUUID: React.PropTypes.string,
        individualUUID: React.PropTypes.string.isRequired,
        backFunction: React.PropTypes.func
    };

    viewName() {
        return 'ProgramEnrolmentDashboardView';
    }

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.programEnrolmentDashboard);
        this.getForm = this.getForm.bind(this);
    }

    componentWillMount() {
        return super.componentWillMount();
    }

    componentDidMount() {
        this.dispatchOnLoad();
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
                CHSNavigator.navigateToProgramEnrolmentView(this, enrolment, ()=>{}, true);
            }
        });
    }

    editExit() {
        this.dispatchAction(Actions.ON_EDIT_ENROLMENT, {
            enrolmentUUID: this.state.enrolment.uuid, cb: (enrolment) => {
                CHSNavigator.navigateToExitProgram(this, enrolment, true);
            }
        });
    }

    exitProgram() {
        const enrolmentToBeEdited = this.state.enrolment.cloneForEdit();
        enrolmentToBeEdited.programExitDateTime = new Date();
        CHSNavigator.navigateToExitProgram(this, enrolmentToBeEdited);
    }

    enrolmentSelect(enrolmentUUID) {
        this.dispatchAction(Actions.ON_ENROLMENT_CHANGE, {enrolmentUUID: enrolmentUUID});
    }

    getEnrolmentHeaderMessage(enrolment) {
        return `${this.I18n.t("enrolledOn")} ${moment(enrolment.enrolmentDateTime).format("DD-MM-YYYY")}`;
    }

    getExitHeaderMessage(enrolment) {
        return `${this.I18n.t("exitedOn")} ${moment(enrolment.programExitDateTime).format("DD-MM-YYYY")}`;
    }

    getForm() {
        const formMappingService = this.context.getService(FormMappingService);
        return formMappingService.findFormForProgramEnrolment(this.state.enrolment.program);
    }

    getEnrolmentContextActions(isExit) {
        return [new ContextAction('edit', () => isExit ? this.editExit() : this.editEnrolment())];
    }

    getPrimaryEnrolmentContextAction() {
        if (this.state.enrolment.isActive) {
            return new ContextAction('exitProgram', () => this.exitProgram());
        }
    }

    enrolments() {
        return _.get(this.state, 'enrolment.individual.enrolments') || [];
    }

    renderExitObservations() {
        const enrolmentIsActive = this.state.enrolment.isActive;
        return enrolmentIsActive ? (<View/>) :
            (<View>
                <ObservationsSectionTitle
                    contextActions={this.getEnrolmentContextActions(true)}
                    title={this.getExitHeaderMessage(this.state.enrolment)}/>
                <Observations form={this.getForm()}
                              observations={_.defaultTo(this.state.enrolment.programExitObservations, [])}
                              style={{marginVertical: DGS.resizeHeight(8)}}/>
            </View>);
    }

    renderSummary() {
        return _.isEmpty(this.state.enrolmentSummary) ? (<View/>) :
            (<View>
                <ObservationsSectionTitle
                    contextActions={[]}
                    title={this.I18n.t('summary')}/>
                <Observations observations={_.defaultTo(this.state.enrolmentSummary, [])}
                              style={{marginVertical: DGS.resizeHeight(8)}}/>
            </View>);
    }

    render() {
        General.logDebug(this.viewName(), 'render');
        let enrolments = _.reverse(_.sortBy(this.enrolments(), (enrolment) => enrolment.enrolmentDateTime));
        const encounterTypeState = this.state.encounterTypeState;
        const programEncounterTypeState = this.state.programEncounterTypeState;
        const dashboardButtons = this.state.dashboardButtons || [];
        return (
            <CHSContainer theme={{iconFamily: 'MaterialIcons'}}>
                <CHSContent style={{backgroundColor: Styles.defaultBackground}}>
                    <EntityTypeSelector actions={ProgramEncounterTypeChoiceActionNames}
                                        flowState={programEncounterTypeState.flowState}
                                        entityTypes={programEncounterTypeState.entityTypes}
                                        labelKey='followupTypes'
                                        getEntityLabel={(encounterType) => encounterType.displayName}
                                        selectedEntityType={programEncounterTypeState.entity.encounterType}
                                        onEntityTypeSelectionConfirmed={(entityTypeSelectorState) => CHSNavigator.navigateToProgramEncounterView(this, entityTypeSelectorState.entity)}/>


                    <EntityTypeSelector actions={EncounterTypeChoiceActionNames}
                                        flowState={encounterTypeState.flowState}
                                        entityTypes={encounterTypeState.entityTypes}
                                        labelKey='followupTypes'
                                        getEntityLabel={(program) => program.displayName}
                                        selectedEntityType={encounterTypeState.entity.encounterType}
                                        onEntityTypeSelectionConfirmed={(entityTypeSelectorState) => CHSNavigator.navigateToIndividualEncounterLandingView(this, this.state.enrolment.individual.uuid, entityTypeSelectorState.entity)}/>
                    <View>
                        <AppHeader title={this.I18n.t('individualDashboard')} func={this.state.backFunction}/>
                        <IndividualProfile style={{marginHorizontal: 16}} individual={this.state.enrolment.individual}
                                           viewContext={IndividualProfile.viewContext.Program}
                                           programsAvailable={this.state.programsAvailable}/>
                        <ScrollView style={{
                            flexDirection: 'column',
                            borderRadius: 5,
                            marginHorizontal: 16,
                            backgroundColor: Styles.whiteColor
                        }}>
                            <View style={{marginHorizontal: 8}}>
                                {this.state.enrolment.individual.voided &&
                                <Text style={{
                                    fontSize: Fonts.Large,
                                    color: Styles.redColor
                                }}>{this.I18n.t("thisIndividualHasBeenVoided")}</Text>
                                }
                                <Text style={{
                                    fontSize: Fonts.Large,
                                    color: Colors.InputNormal
                                }}>{this.I18n.t('programList')}</Text>
                                <View style={{
                                    flex: 2,
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'stretch'
                                }}>
                                    <View style={{justifyContent: 'flex-start', flex: 1}}>
                                        <ProgramList enrolments={enrolments}
                                                     selectedEnrolment={this.state.enrolment}
                                                     onProgramSelect={(enrolment) => this.enrolmentSelect(enrolment.uuid)}/>
                                    </View>
                                    <ProgramActionsView programDashboardButtons={dashboardButtons}
                                                        enrolment={this.state.enrolment}
                                                        onOpenChecklist={() => this.openChecklist()}
                                                        encounterTypes={encounterTypeState.entityTypes}
                                    />
                                </View>
                            </View>
                            {enrolments.length === 0 ? <View/> :
                                <View style={{marginHorizontal: 8}}>
                                    {this.renderSummary()}
                                    {this.renderExitObservations()}
                                    <View>
                                        <ObservationsSectionTitle contextActions={this.getEnrolmentContextActions()}
                                                                  primaryAction={this.getPrimaryEnrolmentContextAction()}
                                                                  title={this.getEnrolmentHeaderMessage(this.state.enrolment)}/>
                                        <Observations form={this.getForm()}
                                                      observations={this.state.enrolment.observations}
                                                      style={{marginVertical: DGS.resizeHeight(8)}}/>
                                    </View>
                                    <PreviousEncounters encounters={this.state.enrolment.encounters}
                                                        formType={Form.formTypes.ProgramEncounter} onShowMore={() => this.dispatchAction(Actions.SHOW_MORE)}
                                                        showCount={this.state.showCount} showPartial={true}/>
                                </View>}
                        </ScrollView>
                    </View>
                </CHSContent>
            </CHSContainer>
        );
    }
}

export default ProgramEnrolmentDashboardView;