import {ScrollView, ToastAndroid, TouchableOpacity, View} from "react-native";
import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import Reducers from "../../reducer";
import AppHeader from "../common/AppHeader";
import IndividualProfile from "../common/IndividualProfile";
import {ProgramEnrolmentDashboardActionsNames as Actions} from "../../action/program/ProgramEnrolmentDashboardActions";
import Observations from "../common/Observations";
import {Card, Text} from "native-base";
import ProgramList from "./ProgramList";
import moment from "moment";
import PreviousEncounters from "../common/PreviousEncounters";
import Colors from "../primitives/Colors";
import DGS from "../primitives/DynamicGlobalStyles";
import CHSNavigator from "../../utility/CHSNavigator";
import ContextAction from "../viewmodel/ContextAction";
import ObservationsSectionTitle from '../common/ObservationsSectionTitle';
import Fonts from '../primitives/Fonts';
import General from "../../utility/General";
import ProgramActionsView from './ProgramActionsView';
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
import Styles from "../primitives/Styles";
import FormMappingService from "../../service/FormMappingService";
import {Form, WorkItem, WorkList, WorkLists} from 'openchs-models';
import _ from "lodash";
import ActionSelector from "../common/ActionSelector";
import Distances from "../primitives/Distances";
import ObservationsSectionActions from "../common/ObservationsSectionOptions";
import Icon from 'react-native-vector-icons/AntDesign'

@Path('/ProgramEnrolmentDashboardView')
class ProgramEnrolmentDashboardView extends AbstractComponent {
    static propTypes = {
        enrolmentUUID: PropTypes.string,
        individualUUID: PropTypes.string.isRequired,
        backFunction: PropTypes.func
    };

    viewName() {
        return 'ProgramEnrolmentDashboardView';
    }

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.programEnrolmentDashboard);
        this.getForm = this.getForm.bind(this);
        this.state = {displayed: true}
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

    didFocus() {
        super.didFocus();
        this.dispatchOnLoad();
    }

    editEnrolment() {
        this.dispatchAction(Actions.ON_EDIT_ENROLMENT, {
            cb: (enrolment, workLists) => CHSNavigator.navigateToProgramEnrolmentView(this, enrolment, workLists, true)
        });
    }

    editExit() {
        this.dispatchAction(Actions.ON_EDIT_ENROLMENT_EXIT, {
            cb: (enrolment, workLists) => CHSNavigator.navigateToExitProgram(this, enrolment, workLists, true)
        });
    }

    exitProgram() {
        this.dispatchAction(Actions.ON_EXIT_ENROLMENT, {
            cb: (enrolment, workLists) => CHSNavigator.navigateToExitProgram(this, enrolment, workLists)
        });
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
        return formMappingService.findFormForProgramEnrolment(this.state.enrolment.program, this.state.enrolment.individual.subjectType);
    }

    getEnrolmentContextActions(isExit) {
        return [new ContextAction('edit', () => isExit ? this.editExit() : this.editEnrolment())];
    }

    getPrimaryEnrolmentContextAction() {
        if (!this.state.hideExit && this.state.enrolment.isActive) {
            return new ContextAction('exitProgram', () => this.exitProgram());
        }
    }

    enrolments() {
        const nonVoidedEnrolments = this.state.enrolment.individual.nonVoidedEnrolments();
        return _.isEmpty(nonVoidedEnrolments) ? [] : nonVoidedEnrolments;
    }

    renderExitObservations() {
        const enrolmentIsActive = this.state.enrolment.isActive;
        return enrolmentIsActive ? (<View/>) :
            (<View style={{
                padding: Distances.ScaledContentDistanceFromEdge,
                margin: 4,
                elevation: 2,
                backgroundColor: Colors.cardBackgroundColor,
                marginVertical: 16
            }}>
                <Text style={[Fonts.MediumBold]}>{this.getExitHeaderMessage(this.state.enrolment)}</Text>
                <Observations form={this.getForm()}
                              observations={_.defaultTo(this.state.enrolment.programExitObservations, [])}
                              style={{marginVertical: DGS.resizeHeight(8)}}/>
                <ObservationsSectionActions contextActions={this.getEnrolmentContextActions(true)}/>
            </View>);
    }

    renderSummary() {
        return _.isEmpty(this.state.enrolmentSummary) ? (<View/>) :
            (<View style={{
                    padding: Distances.ScaledContentDistanceFromEdge,
                    margin: 4,
                    elevation: 2,
                    backgroundColor: Colors.cardBackgroundColor,
                    marginVertical: 16
                }}>
                    <View>
                        <Text style={[Fonts.MediumBold]}>{this.I18n.t('summary')}</Text>
                        <Text>{this.getEnrolmentHeaderMessage(this.state.enrolment)}</Text>
                        {!_.isNil(this.state.enrolment.programExitDateTime) ?
                            < Text>{this.getExitHeaderMessage(this.state.enrolment)}</Text> : <View/>}
                    </View>
                    <Observations observations={_.defaultTo(this.state.enrolmentSummary, [])}
                                  style={{marginVertical: DGS.resizeHeight(8)}}/>
                </View>
            );
    }

    renderEnrolmentDetails() {
        return (<View style={{
            padding: Distances.ScaledContentDistanceFromEdge,
            margin: 4,
            elevation: 2,
            backgroundColor: Colors.cardBackgroundColor,
            marginVertical: 16
        }}>
            <View style={{flexDirection: 'row', alignItems: 'flex-end'}}>
                <Text style={[Fonts.MediumBold]}>{this.I18n.t('enrolmentDetails')}</Text>
                <TouchableOpacity onPress={() => this.dispatchAction(Actions.ON_ENROLMENT_TOGGLE)}
                                  style={{right: 2, position: 'absolute', alignSelf: 'center'}}>
                    {this.state.expandEnrolmentInfo === false ?
                        <Icon name={'down'} size={25}/> :
                        <Icon name={'up'} size={25}/>}
                </TouchableOpacity>
            </View>
            <View style={{height: this.state.expandEnrolmentInfo === false ? 0 : null, overflow: 'hidden'}}>
                <Observations form={this.getForm()}
                              observations={this.state.enrolment.observations}
                              style={{marginVertical: DGS.resizeHeight(8)}}/>
                <ObservationsSectionActions contextActions={this.getEnrolmentContextActions(true)}
                                            primaryAction={this.getPrimaryEnrolmentContextAction()}/>
            </View>
        </View>);
    }

    displayMessage(message) {
        if (message && this.state.displayed) {
            ToastAndroid.show(message, ToastAndroid.SHORT);
            this.setState({displayed: false})
        }
    }

    render() {
        General.logDebug(this.viewName(), 'render');
        let enrolments = _.reverse(_.sortBy(this.enrolments(), (enrolment) => enrolment.enrolmentDateTime));
        const programEncounterTypeState = this.state.programEncounterTypeState;
        const dashboardButtons = this.state.dashboardButtons || [];
        const encounterActions = this.state.encounterTypes.map(encounterType => ({
            fn: () => {
                this.state.encounter.encounterType = encounterType;
                CHSNavigator.navigateToIndividualEncounterLandingView(
                    this,
                    this.state.enrolment.individual.uuid,
                    this.state.encounter
                );
            },
            label: encounterType.displayName,
            backgroundColor: Colors.ActionButtonColor
        }));
        this.displayMessage(this.props.message || this.props.params && this.props.params.message);
        return (
            <CHSContainer theme={{iconFamily: 'MaterialIcons'}} style={{backgroundColor: Colors.GreyContentBackground}}>
                <CHSContent style={{backgroundColor: Styles.defaultBackground}}>
                    <ActionSelector
                        title={this.I18n.t("followupTypes")}
                        hide={() => this.dispatchAction(Actions.HIDE_ENCOUNTER_SELECTOR)}
                        visible={this.state.displayActionSelector}
                        actions={encounterActions}
                    />
                    <View style={{backgroundColor: Colors.GreyContentBackground}}>
                        <View style={{backgroundColor: Styles.defaultBackground}}>
                            <AppHeader title={this.I18n.t('individualDashboard')} func={this.props.backFunction}/>
                            <IndividualProfile style={{marginHorizontal: 16}}
                                               individual={this.state.enrolment.individual}
                                               viewContext={IndividualProfile.viewContext.Program}
                                               programsAvailable={this.state.programsAvailable}
                                               hideEnrol={this.state.hideEnrol}
                            />
                        </View>
                        <ScrollView style={{
                            flexDirection: 'column',
                            borderRadius: 5,
                            marginHorizontal: 16,
                            backgroundColor: Colors.GreyContentBackground
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
                                                        encounterTypes={this.state.encounterTypes}
                                    />
                                </View>
                            </View>
                            {enrolments.length === 0 ? <View/> :
                                <View>
                                    {this.renderSummary()}
                                    {this.renderExitObservations()}
                                    {this.renderEnrolmentDetails()}
                                    <PreviousEncounters encounters={this.state.enrolment.nonVoidedEncounters()}
                                                        formType={Form.formTypes.ProgramEncounter}
                                                        onShowMore={() => this.dispatchAction(Actions.SHOW_MORE)}
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
