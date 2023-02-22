import AbstractComponent from "../../framework/view/AbstractComponent";
import PropTypes from 'prop-types';
import React from "react";
import {Alert, View} from "react-native";
import Path from "../../framework/routing/Path";
import IndividualProfile from "../common/IndividualProfile";
import FamilyProfile from "../familyfolder/FamilyProfile";
import {Button, ScrollView, Text} from "native-base";
import TypedTransition from "../../framework/routing/TypedTransition";
import WizardButtons from "../common/WizardButtons";
import AppHeader from "../common/AppHeader";
import Colors from "../primitives/Colors";
import Fonts from "../primitives/Fonts";
import Distances from "../primitives/Distances";
import Observations from "../common/Observations";
import General from "../../utility/General";
import ConceptService from "../../service/ConceptService";
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
import {Individual} from 'avni-models';
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
import AvniIcon from "../common/AvniIcon";

@Path('/SystemRecommendationView')
class SystemRecommendationView extends AbstractComponent {
    static propTypes = {
        individual: PropTypes.object,
        saveActionName: PropTypes.string.isRequired,
        onSaveCallback: PropTypes.func.isRequired,
        onPreviousCallback: PropTypes.func,
        decisions: PropTypes.any,
        observations: PropTypes.array.isRequired,
        validationErrors: PropTypes.array.isRequired,
        headerMessage: PropTypes.string,
        checklists: PropTypes.array,
        nextScheduledVisits: PropTypes.array,
        form: PropTypes.object,
        saveAndProceed: PropTypes.object,
        workListState: PropTypes.object,
        isRejectedEntity: PropTypes.bool,
        entityApprovalStatus: PropTypes.object,
    };

    static defaultProps = {
        isSaveDraftOn: false,
        isRejectedEntity: false,
    };

    static styles = {
        rulesRowView: {backgroundColor: Colors.GreyContentBackground, paddingBottom: 19, paddingLeft: 10}
    };

    viewName() {
        return 'SystemRecommendationView';
    }

    constructor(props, context) {
        super(props, context);
        this.state = {showApprovalDialog: false, viewHeight: -1, bottom: -1};
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
            Alert.alert(this.I18n.t("voidedIndividualAlertTitle"),
                this.I18n.t("voidedIndividualAlertMessage"));
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
        const onYesPress = () => CHSNavigator.navigateToFirstPage(this, wizardViews);
        isSaveDraftOn ? onYesPress() : AvniAlert(this.I18n.t('backPressTitle'), this.I18n.t('backPressMessage'), onYesPress, this.I18n);
    }

    doDisplayScrollButton() {
        const {viewHeight, bottom} = this.state;
        if (viewHeight === -1 || bottom === -1) return false;
        return bottom > viewHeight;
    }

    render() {
        General.logDebug(this.viewName(), `render`);
        const displayScrollButton = this.doDisplayScrollButton();
        return (
            <CHSContainer onLayout={(e) => this.setState({viewHeight: e.nativeEvent.layout.height})}>
                <CHSContent>
                    <AppHeader title={this.props.headerMessage}
                               func={() => this.onAppHeaderBack(this.props.isSaveDraftOn)}
                               displayHomePressWarning={!this.props.isSaveDraftOn}/>
                    <RejectionMessage I18n={this.I18n} entityApprovalStatus={this.props.entityApprovalStatus}/>
                    <ScrollView ref={this.scrollRef}>
                        <View style={{flexDirection: 'column'}}>
                            {!_.isNil(this.props.individual) && this.profile()}
                            <View style={{flexDirection: 'column', marginHorizontal: Distances.ContentDistanceFromEdge}}>
                                {displayScrollButton &&
                                <Button style={{alignSelf: "flex-end", backgroundColor: Colors.AccentColor}}
                                        leftIcon={<AvniIcon type="MaterialIcons" name="arrow-circle-down" color={Colors.TextOnPrimaryColor} style={{fontSize: 20}}/>}
                                        onPress={() => this.scrollToBottom()}>{this.I18n.t("scrollToBottomToSave")}</Button>}
                                <View style={this.scaleStyle({paddingVertical: 12, flexDirection: 'column'})}>
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
                                                  observations={this.context.getService(ConceptService).getObservationsFromDecisions(this.props.decisions)}
                                                  title={this.I18n.t('systemRecommendations')}/>
                                </View>
                                <NextScheduledVisits nextScheduledVisits={this.props.nextScheduledVisits.filter(nsv => _.isNil(nsv.subject))}
                                                     title={this.I18n.t('visitsBeingScheduled')}/>
                                <NextScheduledVisitsForOtherSubjects nextScheduledVisits={this.props.nextScheduledVisits.filter(nsv => !_.isNil(nsv.subject))}
                                                                     title={this.I18n.t('visitsBeingScheduledForOthers')}/>
                                {!_.isNil(this.props.individual) &&
                                <GroupAffiliationInformation individual={this.props.individual} I18n={this.I18n}/>}
                                <Observations observations={this.props.observations} form={this.props.form}
                                              title={this.I18n.t('observations')}/>
                                <WizardButtons previous={{
                                    func: () => !_.isUndefined(this.props.onPreviousCallback) ? this.props.onPreviousCallback(this.context) : this.previous(),
                                    label: this.I18n.t('previous')
                                }}
                                               next={{
                                                   func: () => this.save(() => this.props.onSaveCallback(this)),
                                                   visible: this.props.validationErrors.length === 0,
                                                   label: this.I18n.t('save')
                                               }}
                                               nextAndMore={this.nextAndMore}
                                               style={{marginHorizontal: 24}}/>

                            </View>
                            <View onLayout={(e) => this.setState({bottom: e.nativeEvent.layout.y})}/>
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
                </CHSContent>
            </CHSContainer>
        );
    }
}

export default SystemRecommendationView;

