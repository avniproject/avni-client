// @flow
import TypedTransition from "../framework/routing/TypedTransition";
import ProgramEnrolmentView from "../views/program/ProgramEnrolmentView";
import ProgramExitView from "../views/program/ProgramExitView";
import _ from "lodash";
import ProgramEncounterView from "../views/program/ProgramEncounterView";
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
import IndividualAddRelativeView from "../views/individual/IndividualAddRelativeView";
import FamilyDashboardView from "../views/familyfolder/FamilyDashboardView";
import ChecklistItemView from "../views/program/ChecklistItemView";
import VideoPlayerView from "../views/videos/VideoPlayerView";
import SubjectRegisterView from "../views/subject/SubjectRegisterView";
import IndividualEncounterView from "../views/individual/IndividualEncounterView";
import IndividualRegisterFormView from "../views/individual/IndividualRegisterFormView";
import FilterView from "../views/filter/FiltersView";
import {EncounterType, ProgramEncounter, ProgramEnrolment, SubjectType, WorkItem} from "openchs-models";
import ProgramService from "../service/program/ProgramService";
import IndividualService from "../service/IndividualService";
import ProgramEnrolmentService from "../service/ProgramEnrolmentService";
import General from "./General";
import WorkListState from "../state/WorkListState";
import EntityService from "../service/EntityService";
import ProgramEncounterService from "../service/program/ProgramEncounterService";
import ProgramEnrolmentTabView from "../views/program/ProgramEnrolmentTabView";
import BeneficiaryDashboard from "../views/beneficiarymode/BeneficiaryDashboard";


class CHSNavigator {
    static navigateToLoginView(source, allowSkipLogin, backFunction) {
        TypedTransition.from(source).with({
            allowSkipLogin: allowSkipLogin,
            backFunction: backFunction
        }).to(LoginView, true, _.isNil(backFunction));
    }

    static navigateToLandingView(source, replace, props) {
        TypedTransition.from(source).with(props).to(LandingView, true, replace);
    }

    static navigateToProgramEnrolmentView(source, enrolment, workLists, editing = false) {
        if (ProgramEnrolmentView.canLoad({enrolment}, source)) {
            TypedTransition.from(source).with({
                enrolment: enrolment,
                editing,
                workLists
            }).to(ProgramEnrolmentView, true);
        }
    }

    static navigateToProgramEnrolmentDashboardView(source, individualUUID, selectedEnrolmentUUID, isFromWizard, backFn, message) {
        const from = TypedTransition.from(source);
        const toBeRemoved = [SystemRecommendationView, SubjectRegisterView, ProgramEnrolmentView,
            ProgramEncounterView, ProgramExitView, ProgramEncounterCancelView];
        if (isFromWizard) {
            from.resetStack(toBeRemoved, [
                TypedTransition.createRoute(ProgramEnrolmentTabView, {
                    individualUUID: individualUUID,
                    enrolmentUUID: selectedEnrolmentUUID,
                    message,
                    backFunction: backFn,
                    tab: 2,
                }, true)
            ]);
        } else {
            from.with({individualUUID: individualUUID, backFunction: backFn, tab: 2}).to(ProgramEnrolmentTabView, true);
        }
    }

    static navigateToExitProgram(source, enrolment, workLists, editing = false) {
        TypedTransition.from(source).with({enrolment, workLists, editing}).to(ProgramExitView);
    }

    static navigateToStartProgramView(source, enrolmentUUID) {
        TypedTransition.from(source).with({enrolmentUUID: enrolmentUUID}).to(StartProgramView);
    }

    static goBack(source) {
        TypedTransition.from(source).goBack()
    }

    static navigateToProgramEncounterView(source, programEncounter, editing = false, encounterTypeName, enrolmentUUID, message, backFn) {
        TypedTransition.from(source).with({
            programEncounter: programEncounter,
            editing,
            encounterTypeName,
            enrolmentUUID,
            message,
            backFunction: backFn
        }).to(ProgramEncounterView);
    }

    static navigateToChecklistItemView(source, checklistItem) {
        TypedTransition.from(source).with({checklistItem: checklistItem}).to(ChecklistItemView);
    }

    static navigateToProgramEncounterCancelView(source, programEncounter, editing = false) {
        TypedTransition.from(source).with({programEncounter: programEncounter, editing}).to(ProgramEncounterCancelView);
    }

    static navigateToIndividualRegistrationDetails(source, individualUUID, backFunction) {
        TypedTransition.from(source).with({
            individualUUID: individualUUID,
            backFunction: backFunction,
            tab: 1
        }).to(ProgramEnrolmentTabView);
    }

    static navigateToRegisterView(source, workLists, message) {
        const workItem = workLists.getCurrentWorkItem();
        const uuid = workItem.parameters.uuid;
        const subjectTypeName = workItem.parameters.subjectTypeName;
        const target = SubjectType.create(workItem.parameters.subjectTypeName).isIndividual() ? IndividualRegisterView : SubjectRegisterView;
        if (target.canLoad({uuid, subjectTypeName}, source)) {
            TypedTransition.from(source).with({
                subjectUUID: uuid,
                individualUUID: uuid,
                editing: !_.isNil(uuid),
                workLists,
                message
            }).to(target)
        }
    }

    static navigateToIndividualEncounterLandingView(source, individualUUID, encounter, editing = false) {
        TypedTransition.from(source).bookmark().with({
            encounter: encounter,
            individualUUID: individualUUID,
            editing
        }).to(IndividualEncounterLandingView, true);
    }

    static navigateToSystemRecommendationViewFromEncounterWizard(source, decisions, ruleValidationErrors, encounter, action, headerMessage, form, workListState, message) {
        const onSaveCallback = (source) => {
            TypedTransition
                .from(source)
                .resetStack([SystemRecommendationView, IndividualEncounterLandingView, IndividualEncounterView], [
                    TypedTransition.createRoute(ProgramEnrolmentTabView, {
                        individualUUID: encounter.individual.uuid, message, tab: 3
                    }, true)
                ]);
        };
        CHSNavigator.navigateToSystemsRecommendationView(source, decisions, ruleValidationErrors, encounter.individual, encounter.observations, action, onSaveCallback, headerMessage, null, null, form, workListState, message);
    }

    static navigateToSystemsRecommendationView(source, decisions, validationErrors, individual, observations, saveActionName, onSaveCallback, headerMessage, checklists, nextScheduledVisits, form, workListState, message) {
        TypedTransition.from(source).with({
            form,
            decisions,
            individual,
            saveActionName,
            onSaveCallback,
            observations,
            validationErrors,
            headerMessage,
            checklists: _.isNil(checklists) ? [] : checklists,
            nextScheduledVisits: _.isNil(nextScheduledVisits) ? [] : nextScheduledVisits,
            message,
            workListState
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
        TypedTransition.from(source).with({
            individual: individual,
            onSaveCallback: onSaveCallback
        }).to(IndividualAddRelativeView, true);
    }

    static navigateToFamilyDashboardView(source, familyUUID) {
        TypedTransition.from(source).with({familyUUID: familyUUID}).to(FamilyDashboardView, true);
    }

    static navigateToVideoPlayerView(source, props) {
        TypedTransition.from(source).with(props).to(VideoPlayerView, true);
    }

    static onSaveGoToProgramEnrolmentDashboardView(recommendationsView, individualUUID) {
        const toBeRemoved = [SystemRecommendationView, IndividualRegisterFormView, IndividualRegisterView, SubjectRegisterView];
        TypedTransition
            .from(recommendationsView)
            .resetStack(toBeRemoved, [
                TypedTransition.createRoute(ProgramEnrolmentTabView, {
                    individualUUID,
                    message: recommendationsView.I18n.t("registrationSavedMsg"),
                    tab: 1
                }, true)
            ]);
    }

    static getMessage(i18n, workItem: WorkItem) {
        switch (workItem.type) {
            case WorkItem.type.REGISTRATION:
                return i18n.t("registrationSavedMsg")
            case WorkItem.type.PROGRAM_ENROLMENT:
                return i18n.t("enrolmentSavedMsg", {programName: workItem.parameters.programName});
            case WorkItem.type.PROGRAM_ENCOUNTER:
                return i18n.t("encounterSavedMsg", {encounterName: workItem.parameters.encounterType});
            case WorkItem.type.CANCELLED_ENCOUNTER:
                return i18n.t("encounterCancelledMsg", {encounterName: workItem.parameters.encounterType});
            default:
                throw new Error("Invalid WorkItemType");
        }
    }

    static performNextWorkItemFromRecommendationsView(recommendationsView, workListState: WorkListState, context) {
        const currentWorkItem = workListState.currentWorkItem;
        const message = this.getMessage(recommendationsView.I18n, currentWorkItem);
        const nextWorkItem = workListState.moveToNextWorkItem();

        const toBePoped = [
            SystemRecommendationView,
            IndividualRegisterFormView,
            IndividualRegisterView,
            SubjectRegisterView,
            ProgramEncounterView,
            ProgramEnrolmentView
        ];
        switch (nextWorkItem.type) {
            case WorkItem.type.REGISTRATION: {
                const uuid = nextWorkItem.parameters.uuid;
                const target = SubjectType.create(nextWorkItem.parameters.subjectTypeName).isIndividual() ? IndividualRegisterView : SubjectRegisterView;
                TypedTransition.from(recommendationsView)
                    .resetStack(toBePoped, [
                        TypedTransition.createRoute(target, {
                            subjectUUID: uuid,
                            individualUUID: uuid,
                            editing: !_.isNil(uuid),
                            workLists: workListState.workLists,
                            message: message
                        })
                    ]);
                break;
            }
            case WorkItem.type.PROGRAM_ENROLMENT: {
                const individual = context.getService(IndividualService).findByUUID(nextWorkItem.parameters.subjectUUID);
                const program = context.getService(ProgramService).allPrograms().find((program) => program.name === nextWorkItem.parameters.programName);
                const enrolment = ProgramEnrolment.createEmptyInstance({individual, program});
                TypedTransition.from(recommendationsView)
                    .resetStack(toBePoped, [
                        TypedTransition.createRoute(ProgramEnrolmentTabView, {individualUUID: nextWorkItem.parameters.subjectUUID}, true),
                        TypedTransition.createRoute(ProgramEnrolmentView, {
                            enrolment: enrolment,
                            workLists: workListState.workLists,
                            message: message,
                            tab: 2
                        }, true)
                    ]);
                break;
            }
            case WorkItem.type.PROGRAM_ENCOUNTER: {
                let programEncounter;
                if (_.isEmpty(nextWorkItem.parameters.uuid)) {
                    const {programEnrolmentUUID, encounterType} = nextWorkItem.parameters;
                    const enrolment = context.getService(ProgramEnrolmentService).findByUUID(programEnrolmentUUID);
                    const programEncounterService = context.getService(ProgramEncounterService);
                    //Use a due encounter if available
                    const dueEncounter = programEncounterService.findDueEncounter({
                        enrolmentUUID: programEnrolmentUUID,
                        encounterTypeName: encounterType
                    });
                    if (dueEncounter) {
                        programEncounter = dueEncounter.cloneForEdit();
                        programEncounter.encounterDateTime = new Date();
                    } else {
                        programEncounter = ProgramEncounter.createEmptyInstance();
                        programEncounter.encounterType = context.getService(EntityService).findByKey('name', encounterType, EncounterType.schema.name);
                        programEncounter.programEnrolment = enrolment;
                    }
                } else {
                    programEncounter = context.getService(ProgramEncounterService).findByUUID(nextWorkItem.parameters.uuid).cloneForEdit();
                    programEncounter.encounterDateTime = programEncounter.encounterDateTime || new Date();
                }
                TypedTransition.from(recommendationsView)
                    .resetStack(toBePoped, [
                        TypedTransition.createRoute(ProgramEnrolmentTabView, {individualUUID: nextWorkItem.parameters.subjectUUID}, true),
                        TypedTransition.createRoute(ProgramEncounterView, {
                            params: {
                                enrolmentUUID: programEncounter.programEnrolment.uuid,
                                encounterType: nextWorkItem.parameters.encounterType,
                                workLists: workListState.workLists,
                                message: message,
                                programEncounter,
                                tab: 2
                            }
                        }, true)
                    ]);
                break;
            }
            default: {
                General.logError('CHSNavigator', 'Cannot navigate to this work item. Resetting view.');
                TypedTransition.from(recommendationsView).resetStack(toBePoped);
            }
        }
    }

    static navigateToFirstPage(source, itemsToBeRemoved) {
        TypedTransition.from(source).resetStack(itemsToBeRemoved)
    }

    static navigateToFilterView(source, props) {
        TypedTransition.from(source).with(props).to(FilterView, true);
    }

    static navigateToBeneficiaryDashboard(source, props) {
        TypedTransition.from(source).with(props).to(BeneficiaryDashboard, true);
    }
}

export default CHSNavigator;
