import AbstractComponent from "../../framework/view/AbstractComponent";
import PropTypes from 'prop-types';
import React from "react";
import {Alert, View} from "react-native";
import Path from "../../framework/routing/Path";
import IndividualProfile from "../common/IndividualProfile";
import FamilyProfile from "../familyfolder/FamilyProfile";
import {Text} from "native-base";
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
import IndividualRegisterView from "../individual/IndividualRegisterView";
import IndividualRegisterFormView from "../individual/IndividualRegisterFormView";
import ProgramEncounterView from "../program/ProgramEncounterView";
import ProgramEncounterCancelView from "../program/ProgramEncounterCancelView";
import ProgramExitView from "../program/ProgramExitView";
import NewVisitPageView from "../program/NewVisitPageView";
import ProgramEnrolmentView from "../program/ProgramEnrolmentView";
import {AvniAlert} from "../common/AvniAlert";
import IndividualEncounterLandingView from "../individual/IndividualEncounterLandingView";
import IndividualEncounterView from "../individual/IndividualEncounterView";
import ChecklistItemView from "../program/ChecklistItemView";
import SubjectRegisterView from "../subject/SubjectRegisterView";

@Path('/SystemRecommendationView')
class SystemRecommendationView extends AbstractComponent {
    static propTypes = {
        individual: PropTypes.object.isRequired,
        saveActionName: PropTypes.string.isRequired,
        onSaveCallback: PropTypes.func.isRequired,
        decisions: PropTypes.any,
        observations: PropTypes.array.isRequired,
        validationErrors: PropTypes.array.isRequired,
        headerMessage: PropTypes.string,
        checklists: PropTypes.array,
        nextScheduledVisits: PropTypes.array,
        form: PropTypes.object,
        saveAndProceed: PropTypes.object,
        workListState: PropTypes.object,
    };

    static styles = {
        rulesRowView: {backgroundColor: Colors.GreyContentBackground, paddingBottom: 19, paddingLeft: 10}
    };

    viewName() {
        return 'SystemRecommendationView';
    }

    constructor(props, context) {
        super(props, context);
    }

    get individual() {
        return this.props.individual;
    }

    get nextAndMore() {
        let workListState = this.props.workListState;
        if(_.isNil(workListState))
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
        if (this.props.individual.voided) {
            Alert.alert(this.I18n.t("voidedIndividualAlertTitle"),
                this.I18n.t("voidedIndividualAlertMessage"));
        } else {
            this.dispatchAction(this.props.saveActionName, {
                decisions: this.props.decisions,
                checklists: this.props.checklists,
                nextScheduledVisits: this.props.nextScheduledVisits,
                message: this.props.message,
                cb,
                error: (message) => this.showError(message)
            });
        }
    }

    previous() {
        TypedTransition.from(this).goBack();
    }

    profile() {
        return (this.props.individual instanceof Individual) ?
            <IndividualProfile viewContext={IndividualProfile.viewContext.Wizard}
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

    onAppHeaderBack() {
        const wizardViews = [IndividualRegisterView, IndividualRegisterFormView, SystemRecommendationView, ProgramEncounterView, ProgramEncounterCancelView, ProgramExitView, NewVisitPageView,
            ProgramEnrolmentView, IndividualEncounterView, IndividualEncounterLandingView, ChecklistItemView, SubjectRegisterView];
        const onYesPress = () => CHSNavigator.navigateToFirstPage(this, wizardViews);
        AvniAlert(this.I18n.t('backPressTitle'), this.I18n.t('backPressMessage'), onYesPress, this.I18n);
    }

    render() {
        General.logDebug(this.viewName(), `render`);
        return (
            <CHSContainer>
                <CHSContent>
                    <AppHeader title={this.props.headerMessage}
                               func={() => this.onAppHeaderBack()}
                               displayHomePressWarning={true}/>
                    <View style={{flexDirection: 'column'}}>
                        {this.profile()}
                        <View style={{flexDirection: 'column', marginHorizontal: Distances.ContentDistanceFromEdge}}>
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
                            <NextScheduledVisits nextScheduledVisits={this.props.nextScheduledVisits}
                                                 title={this.I18n.t('visitsBeingScheduled')}/>
                            <Observations observations={this.props.observations} form={this.props.form}
                                          title={this.I18n.t('observations')}/>
                            <WizardButtons previous={{func: () => this.previous(), label: this.I18n.t('previous')}}
                                           next={{
                                               func: () => this.save(() => this.props.onSaveCallback(this)),
                                               visible: this.props.validationErrors.length === 0,
                                               label: this.I18n.t('save')
                                           }}
                                           nextAndMore={this.nextAndMore}
                                           style={{marginHorizontal: 24}}/>

                        </View>
                    </View>
                </CHSContent>
            </CHSContainer>
        );
    }
}

export default SystemRecommendationView;

