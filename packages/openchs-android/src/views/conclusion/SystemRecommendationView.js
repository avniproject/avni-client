import AbstractComponent from "../../framework/view/AbstractComponent";
import PropTypes from 'prop-types';
import React from "react";
import {StyleSheet, View} from "react-native";
import Path from "../../framework/routing/Path";
import CustomConfirmDialog from "../common/CustomConfirmDialog";
import IndividualProfile from "../common/IndividualProfile";
import FamilyProfile from "../familyfolder/FamilyProfile";
import {ScrollView, Text} from "native-base";
import TypedTransition from "../../framework/routing/TypedTransition";
import WizardButtons from "../common/WizardButtons";
import AppHeader from "../common/AppHeader";
import Colors from "../primitives/Colors";
import Fonts from "../primitives/Fonts";
import Distances from "../primitives/Distances";
import Styles from "../primitives/Styles";
import Observations from "../common/Observations";
import General from "../../utility/General";
import ConceptService from "../../service/ConceptService";
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
import {Individual, WorkItem} from 'avni-models';
import NextScheduledVisits from "../common/NextScheduledVisits";
import CHSNavigator from "../../utility/CHSNavigator";
import PersonRegisterView from "../individual/PersonRegisterView";
import PersonRegisterFormView from "../individual/PersonRegisterFormView";
import ProgramEncounterView from "../program/ProgramEncounterView";
import ProgramEncounterCancelView from "../program/ProgramEncounterCancelView";
import ProgramExitView from "../program/ProgramExitView";
import NewVisitPageView from "../program/NewVisitPageView";
import ProgramEnrolmentView from "../program/ProgramEnrolmentView";
import {AvniAlert} from "../common/AvniAlert";
import IndividualEncounterView from "../individual/IndividualEncounterView";
import ChecklistItemView from "../program/ChecklistItemView";
import SubjectRegisterView from "../subject/SubjectRegisterView";
import NextScheduledVisitsForOtherSubjects from "../common/NextScheduledVisitsForOtherSubjects";
import {ApprovalDialog} from "../approval/ApprovalDialog";
import {RejectionMessage} from "../approval/RejectionMessage";
import GroupAffiliationInformation from "../common/GroupAffiliationInformation";
import _ from 'lodash'
import {Actions as IGHActions} from "../../action/individual/IndividualGeneralHistoryActions";
import {ProgramEnrolmentDashboardActionsNames as PEDActions} from "../../action/program/ProgramEnrolmentDashboardActions";

@Path('/SystemRecommendationView')
class SystemRecommendationView extends AbstractComponent {
    static propTypes = {
        individual: PropTypes.object,
        saveActionName: PropTypes.string.isRequired,
        onSaveCallback: PropTypes.func.isRequired,
        onPreviousCallback: PropTypes.func,
        form: PropTypes.object.isRequired,
        decisions: PropTypes.object,
        validationErrors: PropTypes.array,
        observations: PropTypes.array,
        headerMessage: PropTypes.string,
        checklists: PropTypes.array,
        nextScheduledVisits: PropTypes.array,
        message: PropTypes.string,
        workListState: PropTypes.object,
        isSaveDraftOn: PropTypes.bool,
        isRejectedEntity: PropTypes.bool,
        entityApprovalStatus: PropTypes.object,
        affiliatedGroups: PropTypes.array,
        enrolmentUUID: PropTypes.string
    };

    static defaultProps = {
        isSaveDraftOn: false,
        isRejectedEntity: false,
    };

    static styles = {
        rulesRowView: {backgroundColor: Colors.GreyContentBackground, paddingBottom: 19, paddingLeft: 10},
        summaryCard: {
            backgroundColor: '#ffffff',
            borderRadius: 4,
            paddingHorizontal: 16,
            paddingVertical: 16,
            marginTop: 12
        },
        groupSummaryOuterBorder: {
            borderRadius: 12,
            borderWidth: 1,
            borderColor: 'rgba(0, 0, 0, 0.12)',
            backgroundColor: '#ffffff',
            padding: 6,
            marginTop: 12,
            marginBottom: 12
        },
        groupSummaryCard: {
            backgroundColor: '#ffffff',
            borderRadius: 8,
            overflow: 'hidden'
        }
    };

    viewName() {
        return 'SystemRecommendationView';
    }

    constructor(props, context) {
        super(props, context);
        this.state = {showApprovalDialog: false};
        this.scrollRef = React.createRef();
    }

    get individual() {
        return this.props.individual;
    }

    get nextAndMore() {
        let workListState = this.props.workListState;
        if (_.isNil(workListState))
            return {};
        if (!workListState.peekNextWorkItem()) return {};

        const workItemLabel = workListState.saveAndProceedButtonLabel(this.I18n);
        return {
            label: workItemLabel,
            func: () => this.save(() => {
                CHSNavigator.performNextWorkItemFromRecommendationsView(this, this.props.workListState, this.context);
            }),
            visible: this.props.validationErrors.length === 0,
        };
    }

    save(cb) {
        if (_.get(this.props, 'individual.voided')) {
            CustomConfirmDialog.showAlert({
                title: this.I18n.t("voidedIndividualAlertTitle"),
                message: this.I18n.t("voidedIndividualAlertMessage")
            });
        } else if (this.props.isRejectedEntity) {
            this.setState({showApprovalDialog: true});
        } else {
            this.dispatchSaveAction(cb);
        }
    }

    dispatchSaveAction(cb, otherParams) {
        this.dispatchAction(this.props.saveActionName, {
            decisions: this.props.decisions,
            checklists: this.props.checklists,
            nextScheduledVisits: this.props.nextScheduledVisits,
            message: this.props.message,
            cb,
            error: (message) => this.showError(message),
            ...otherParams
        });
    }

    onYesPress(cb) {
        this.dispatchSaveAction(cb);
    }

    onNoPress(cb) {
        this.dispatchSaveAction(cb, {skipCreatingPendingStatus: true});
    }

    onClose() {
        this.setState({showApprovalDialog: false});
    }

    getDialogState() {
        return {
            title: this.I18n.t('changeStatusToPendingTitle'),
            message: this.I18n.t('changeStatusToPendingMsg'),
            openDialog: this.state.showApprovalDialog,
        }
    }

    previous() {
        TypedTransition.from(this).goBack();
    }

    // headerMessage arrives pre-composed as "{form/encounter name} - {Summary & Recommendations}"
    // from every caller - split on the last " - " so the header can show the generic part as the
    // bold title and the specific form name as a subtitle, matching the two-line header design.
    // Falls back to the untouched single-line string if a caller ever uses a different format.
    get headerTitleParts() {
        const full = this.props.headerMessage || '';
        const separatorIndex = full.lastIndexOf(' - ');
        if (separatorIndex === -1) return {title: full, subtitle: undefined};
        return {title: full.substring(separatorIndex + 3), subtitle: full.substring(0, separatorIndex)};
    }

    profile() {
        return (this.props.individual instanceof Individual) ?
            <IndividualProfile viewContext={IndividualProfile.viewContext.Wizard}
                               displayOnly={true}
                               individual={this.props.individual} style={{
                backgroundColor: Colors.GreyContentBackground,
                paddingHorizontal: 24,
                paddingBottom: 12
            }}/> :
            <FamilyProfile viewContext={FamilyProfile.viewContext.Wizard}
                           family={this.props.individual} style={{
                backgroundColor: Colors.GreyContentBackground,
                paddingHorizontal: 24,
                paddingBottom: 12
            }}/>


    }

    onAppHeaderBack(isSaveDraftOn) {
        const wizardViews = [PersonRegisterView, PersonRegisterFormView, SystemRecommendationView, ProgramEncounterView, ProgramEncounterCancelView, ProgramExitView, NewVisitPageView,
            ProgramEnrolmentView, IndividualEncounterView, ChecklistItemView, SubjectRegisterView];
        const onYesPress = () => {
            // Check if this is a program encounter based on saveActionName
            const isProgramEncounter = this.props.saveActionName.startsWith('PEncA');

            if (isProgramEncounter) {
                // For program encounters, use the enrolmentUUID if available
                if (this.props.enrolmentUUID) {
                    this.dispatchAction(PEDActions.ON_RENDER, {enrolmentUUID: this.props.enrolmentUUID});
                }
            } else {
                // For individual encounters, refresh individual drafts
                this.dispatchAction(IGHActions.ON_RENDER, {individualUUID: this.props.individual.uuid});
            }

            CHSNavigator.navigateToFirstPage(this, wizardViews);
        }
        isSaveDraftOn ? onYesPress() : AvniAlert(this.I18n.t('backPressTitle'), this.I18n.t('backPressMessage'), onYesPress, this.I18n);
    }

    render() {
        General.logDebug(this.viewName(), `render`);
        const ownScheduledVisits = this.props.nextScheduledVisits.filter(nsv => _.isNil(nsv.subject));
        const systemRecommendationObservations = this.context.getService(ConceptService).getObservationsFromDecisions(this.props.decisions);
        const showSystemRecommendationsCard = this.props.validationErrors.length > 0 || systemRecommendationObservations.length > 0;
        return (
            <CHSContainer>
                <CHSContent>
                    <AppHeader title={this.headerTitleParts.title}
                               subtitle={this.headerTitleParts.subtitle}
                               func={() => this.onAppHeaderBack(this.props.isSaveDraftOn)}
                               displayHomePressWarning={!this.props.isSaveDraftOn}/>
                    <RejectionMessage I18n={this.I18n} entityApprovalStatus={this.props.entityApprovalStatus}/>
                    <ScrollView ref={this.scrollRef} style={{flex: 1}}>
                        <View style={{flexDirection: 'column', backgroundColor: Styles.greyBackground}}>
                            {!_.isNil(this.props.individual) && this.profile()}
                            <View style={{flexDirection: 'column', marginHorizontal: Distances.ContentDistanceFromEdge}}>
                                {showSystemRecommendationsCard &&
                                    <View style={this.scaleStyle(SystemRecommendationView.styles.summaryCard)}>
                                        {
                                            this.props.validationErrors.map((validationResult, index) => {
                                                return (
                                                    <View style={this.scaleStyle(SystemRecommendationView.styles.rulesRowView)}
                                                          key={`error${index}`}>
                                                        <Text style={{
                                                            fontSize: Fonts.Medium,
                                                            color: Colors.ValidationError
                                                        }}>{this.I18n.t(validationResult.messageKey)}</Text>
                                                    </View>
                                                );
                                            })
                                        }
                                        <Observations highlight
                                                      observations={systemRecommendationObservations}
                                                      title={this.I18n.t('systemRecommendations')}/>
                                    </View>}
                                {ownScheduledVisits.length > 0 &&
                                    <View style={this.scaleStyle(SystemRecommendationView.styles.summaryCard)}>
                                        <NextScheduledVisits nextScheduledVisits={ownScheduledVisits}
                                                             title={this.I18n.t('visitsBeingScheduled')}/>
                                    </View>}
                                <NextScheduledVisitsForOtherSubjects nextScheduledVisits={this.props.nextScheduledVisits.filter(nsv => !_.isNil(nsv.subject))}
                                                                     title={this.I18n.t('visitsBeingScheduledForOthers')}/>
                                {!_.isNil(this.props.individual) &&
                                    <GroupAffiliationInformation individual={this.props.individual} affiliatedGroups={this.props.affiliatedGroups} I18n={this.I18n}/>}
                                {this.props.observations.length > 0 &&
                                    <React.Fragment>
                                        <Text style={[Fonts.Title, {marginTop: 12}]}>{this.I18n.t('observationSummary')}</Text>
                                        <View style={this.scaleStyle(SystemRecommendationView.styles.groupSummaryOuterBorder)}>
                                            <View style={this.scaleStyle(SystemRecommendationView.styles.groupSummaryCard)}>
                                                <Observations observations={this.props.observations} form={this.props.form}/>
                                            </View>
                                        </View>
                                    </React.Fragment>}
                            </View>
                            <ApprovalDialog
                                primaryButton={this.I18n.t('yes')}
                                secondaryButton={this.I18n.t('no')}
                                onPrimaryPress={() => this.onYesPress(() => this.props.onSaveCallback(this))}
                                onSecondaryPress={() => this.onNoPress(() => this.props.onSaveCallback(this))}
                                onClose={() => this.onClose()}
                                state={this.getDialogState()}
                                I18n={this.I18n}/>
                        </View>
                    </ScrollView>
                    <View style={styles.fixedButtonBar}>
                        <WizardButtons
                            containerStyle={{paddingHorizontal: Distances.ScaledContentDistanceFromEdge}}
                            buttonHeight={56}
                            previous={{
                            func: () => !_.isUndefined(this.props.onPreviousCallback) ? this.props.onPreviousCallback(this.context) : this.previous(),
                            label: this.I18n.t('previous')
                        }}
                                       next={{
                                           func: () => this.save(() => {
                                               const ws = this.props.workListState;
                                               const next = ws && ws.peekNextWorkItem();
                                               if (next && next.type === WorkItem.type.SHARE) {
                                                   CHSNavigator.performNextWorkItemFromRecommendationsView(this, ws, this.context);
                                               } else {
                                                   this.props.onSaveCallback(this);
                                               }
                                           }),
                                           visible: this.props.validationErrors.length === 0,
                                           label: this.I18n.t('save')
                                       }}
                                       nextAndMore={this.nextAndMore}/>
                    </View>
                </CHSContent>
            </CHSContainer>
        );
    }
}

const styles = StyleSheet.create({
    fixedButtonBar: {
        // minHeight (not a fixed height) - this bar can carry an extra "Save and register
        // another..." row above Previous/Save (see nextAndMore), which needs more than the
        // single-row 84 to avoid clipping/overlapping the shadowed background.
        minHeight: 84,
        paddingVertical: 12,
        justifyContent: 'center',
        backgroundColor: '#ffffff',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: -3},
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 8
    }
});

export default SystemRecommendationView;

