import TypedTransition from "../framework/routing/TypedTransition";
import ProgramEnrolmentView from "../views/program/ProgramEnrolmentView";
import ProgramEnrolmentDashboardView from "../views/program/ProgramEnrolmentDashboardView";
import ProgramExitView from "../views/program/ProgramExitView";
import ProgramEnrolmentState from "../action/program/ProgramEnrolmentState";
import _ from "lodash";
import ProgramEncounterView from "../views/program/ProgramEncounterView";
import IndividualRegistrationDetailView from "../views/individual/IndividualRegistrationDetailView";
import IndividualRegisterView from "../views/individual/IndividualRegisterView";
import IndividualEncounterLandingView from "../views/individual/IndividualEncounterLandingView";
import SystemRecommendationView from "../views/conclusion/SystemRecommendationView";
import ChecklistView from "../views/program/ChecklistView";
import StartProgramView from "../views/program/StartProgramView";
import LoginView from "../views/LoginView";
import LandingView from "../views/LandingView";
import MenuView from "../views/MenuView";
import ForgotPasswordView from "../views/ForgotPasswordView";
import SetPasswordView from "../views/SetPasswordView";
import ResetForgottenPasswordView from "../views/ResetForgottenPasswordView";
import ChangePasswordView from "../views/ChangePasswordView";
import ProgramEncounterCancelView from "../views/program/ProgramEncounterCancelView";
import IndividualSearchView from "../views/individual/IndividualSearchView";
import IndividualAddRelativeView from "../views/individual/IndividualAddRelativeView";
import FamilyDashboardView from "../views/familyfolder/FamilyDashboardView";
import ChecklistItemView from "../views/program/ChecklistItemView";
import VideoPlayerView from "../views/videos/VideoPlayerView";
import SubjectRegisterView from "../views/subject/SubjectRegisterView";
import IndividualEncounterView from "../views/individual/IndividualEncounterView";


class CHSNavigator {
    static navigateToLoginView(source, allowSkipLogin, backFunction) {
        TypedTransition.from(source).with({allowSkipLogin: allowSkipLogin, backFunction: backFunction}).to(LoginView, true, _.isNil(backFunction));
    }

    static navigateToLandingView(source, replace, props) {
        TypedTransition.from(source).with(props).to(LandingView, true, replace);
    }

    static navigateToProgramEnrolmentView(source, enrolment, backFunction, editing=false) {
        TypedTransition.from(source).with({
            enrolment: enrolment,
            backFunction: backFunction,
            editing
        }).to(ProgramEnrolmentView, true);
    }

    static navigateToProgramEnrolmentDashboardView(source, individualUUID, selectedEnrolmentUUID, isFromWizard, backFn, message) {
        const from = TypedTransition.from(source);
        if (isFromWizard) {
            from.wizardCompleted([SystemRecommendationView, SubjectRegisterView, ProgramEnrolmentView, ProgramEncounterView, ProgramExitView, ProgramEncounterCancelView], ProgramEnrolmentDashboardView, {
                individualUUID: individualUUID,
                enrolmentUUID: selectedEnrolmentUUID,
                message,
            }, true);
        } else {
            from.with({individualUUID: individualUUID, backFunction: backFn}).to(ProgramEnrolmentDashboardView, true);
        }
    }

    static navigateToExitProgram(source, enrolment, editing=false) {
        TypedTransition.from(source).with({enrolment: enrolment, editing}).to(ProgramExitView);
    }

    static navigateToStartProgramView(source, enrolmentUUID) {
        TypedTransition.from(source).with({enrolmentUUID: enrolmentUUID}).to(StartProgramView);
    }

    static goBack(source) {
        TypedTransition.from(source).goBack()
    }

    static navigateToProgramEncounterView(source, programEncounter, editing=false, encounterTypeName, enrolmentUUID, message) {
        TypedTransition.from(source).with({programEncounter: programEncounter, editing, encounterTypeName, enrolmentUUID, message}).to(ProgramEncounterView);
    }

    static navigateToChecklistItemView(source, checklistItem) {
        TypedTransition.from(source).with({checklistItem: checklistItem}).to(ChecklistItemView);
    }

    static navigateToProgramEncounterCancelView(source, programEncounter, editing=false) {
        TypedTransition.from(source).with({programEncounter: programEncounter, editing}).to(ProgramEncounterCancelView);
    }

    static navigateToIndividualRegistrationDetails(source, individual, backFunction) {
        TypedTransition.from(source).with({individualUUID: individual.uuid, backFunction: backFunction}).to(IndividualRegistrationDetailView);
    }

    static navigateToRegisterView(source, uuid, stitches, subjectType, message) {
        const target = subjectType.isIndividual()? IndividualRegisterView: SubjectRegisterView;
        TypedTransition.from(source).with({subjectUUID: uuid, individualUUID: uuid, editing: !_.isNil(uuid), stitches, message}).to(target);
    }

    static navigateToIndividualEncounterLandingView(source, individualUUID, encounter, editing=false) {
        TypedTransition.from(source).bookmark().with({
            encounter: encounter,
            individualUUID: individualUUID,
            editing
        }).to(IndividualEncounterLandingView, true);
    }

    static navigateToSystemRecommendationViewFromEncounterWizard(source, decisions, ruleValidationErrors, encounter, action, headerMessage, form, message) {
        const onSaveCallback = (source) => {
            TypedTransition
                .from(source)
                .wizardCompleted([SystemRecommendationView, IndividualEncounterLandingView, IndividualEncounterView],
                    ProgramEnrolmentDashboardView, {individualUUID: encounter.individual.uuid, message}, true,);
        };
        CHSNavigator.navigateToSystemsRecommendationView(source, decisions, ruleValidationErrors, encounter.individual, encounter.observations, action, onSaveCallback, headerMessage, null, null, form, null);
    }

    static navigateToSystemsRecommendationView(source, decisions, ruleValidationErrors, individual, observations, saveActionName, onSaveCallback, headerMessage, checklists, nextScheduledVisits, form, saveAndProceed) {
        TypedTransition.from(source).with({
            form: form,
            decisions: decisions,
            individual: individual,
            saveActionName: saveActionName,
            onSaveCallback: onSaveCallback,
            observations: observations,
            validationErrors: ruleValidationErrors,
            headerMessage: headerMessage,
            checklists: _.isNil(checklists) ? [] : checklists,
            nextScheduledVisits: _.isNil(nextScheduledVisits) ? [] : nextScheduledVisits,
            saveAndProceed: saveAndProceed,
        }).to(SystemRecommendationView, true);
    }

    static navigateToChecklistView(source, enrolmentUUID) {
        TypedTransition.from(source).with({
            enrolmentUUID: enrolmentUUID,
        }).to(ChecklistView, true);
    }

    static goHome(view) {
        TypedTransition.from(view).toBeginning();
    }

    static navigateToMenuView(source, startSync) {
        TypedTransition.from(source).with({startSync: startSync}).to(MenuView, true);
    }

    static navigateToForgotPasswordView(source) {
        TypedTransition.from(source).to(ForgotPasswordView, true);
    }

    static navigateToSetPasswordView(source, user) {
        TypedTransition.from(source).with({user: user}).to(SetPasswordView, true);
    }

    static navigateToResetPasswordView(source, user) {
        TypedTransition.from(source).with({user: user}).to(ResetForgottenPasswordView, true);
    }

    static navigateToChangePasswordView(source) {
        TypedTransition.from(source).to(ChangePasswordView, true);
    }

    static navigateToAddRelativeView(source, individual, onSaveCallback) {
        TypedTransition.from(source).with({individual: individual, onSaveCallback: onSaveCallback}).to(IndividualAddRelativeView, true);
    }

    static navigateToFamilyDashboardView(source, familyUUID) {
        TypedTransition.from(source).with({familyUUID: familyUUID}).to(FamilyDashboardView, true);
    }

    static navigateToVideoPlayerView(source, props) {
        TypedTransition.from(source).with(props).to(VideoPlayerView, true);
    }

}

export default CHSNavigator;
