// @flow
import {Encounter, EncounterType, Individual, ProgramEncounter, ProgramEnrolment, SubjectType, WorkItem} from 'avni-models';
import TypedTransition from "../framework/routing/TypedTransition";
import ProgramEnrolmentView from "../views/program/ProgramEnrolmentView";
import ProgramExitView from "../views/program/ProgramExitView";
import _ from "lodash";
import ProgramEncounterView from "../views/program/ProgramEncounterView";
import PersonRegisterView from "../views/individual/PersonRegisterView";
import IndividualEncounterView from "../views/individual/IndividualEncounterView";
import SystemRecommendationView from "../views/conclusion/SystemRecommendationView";
import ChecklistView from "../views/program/ChecklistView";
import NewVisitPageView from "../views/program/NewVisitPageView";
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
import PersonRegisterFormView from "../views/individual/PersonRegisterFormView";
import FilterView from "../views/filter/FiltersView";
import ProgramService from "../service/program/ProgramService";
import IndividualService from "../service/IndividualService";
import ProgramEnrolmentService from "../service/ProgramEnrolmentService";
import General from "./General";
import WorkListState from "../state/WorkListState";
import EntityService from "../service/EntityService";
import ProgramEncounterService from "../service/program/ProgramEncounterService";
import BeneficiaryIdentificationPage from "../views/BeneficiaryIdentificationPage";
import EncounterService from "../service/EncounterService";
import GenericDashboardView from "../views/program/GenericDashboardView";
import AddNewMemberView from "../views/groupSubject/AddNewMemberView";
import {firebaseEvents, logEvent} from "./Analytics";
import PhoneNumberVerificationView from "../views/common/PhoneNumberVerificationView";
import ApprovalDetailsView from "../views/approval/ApprovalDetailsView";
import GroupSubjectService from "../service/GroupSubjectService";
import RemoveMemberView from "../views/groupSubject/RemoveMemberView";
import moment from "moment";
import ManualProgramEligibilityView from "../views/program/ManualProgramEligibilityView";
import FormMappingService from "../service/FormMappingService";
import RuleEvaluationService from "../service/RuleEvaluationService";


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

    static navigateToProgramEnrolmentView(source, enrolment, workLists, editing = false, pageNumber) {
        if (ProgramEnrolmentView.canLoad({enrolment}, source)) {
            TypedTransition.from(source).with({
                enrolment: enrolment,
                editing,
                workLists,
                pageNumber
            }).to(ProgramEnrolmentView, true);
        }
    }

    static navigateToProgramEnrolmentDashboardView(source, individualUUID, selectedEnrolmentUUID, isFromWizard, backFn, message, tab = 2) {
        const from = TypedTransition.from(source);
        const toBeRemoved = [SystemRecommendationView, SubjectRegisterView, ProgramEnrolmentView,
            ProgramEncounterView, ProgramExitView, ProgramEncounterCancelView, NewVisitPageView, GenericDashboardView, ChecklistView, ChecklistItemView, ManualProgramEligibilityView];
        if (isFromWizard) {
            from.resetStack(toBeRemoved, [
                TypedTransition.createRoute(GenericDashboardView, {
                    individualUUID: individualUUID,
                    enrolmentUUID: selectedEnrolmentUUID,
                    message,
                    backFunction: backFn,
                    tab: tab,
                }, true)
            ]);
        } else {
            from.with({individualUUID: individualUUID, backFunction: backFn, tab: 2}).to(GenericDashboardView, true);
        }
    }

    static navigateToApprovalDetailsView(source, entity, schema) {
        TypedTransition.from(source).with({entity, schema}).to(ApprovalDetailsView, true);
    }

    static navigateToPhoneNumberVerificationView(source, next, observation, onSuccess, onSkip) {
        TypedTransition.from(source).bookmark().with({
            source: source,
            next: next,
            onSuccessVerification: onSuccess,
            onSkipVerification: onSkip,
            phoneNumber: observation.getValue()
        }).to(PhoneNumberVerificationView, true)
    }

    static navigateToIndividualEncounterDashboardView(source, individualUUID, encounter, isFromWizard, backFn, message) {
        const from = TypedTransition.from(source);
        const toBeRemoved = [SystemRecommendationView, SubjectRegisterView, ProgramEnrolmentView,
            ProgramEncounterView, ProgramExitView, ProgramEncounterCancelView, NewVisitPageView, GenericDashboardView];
        if (isFromWizard) {
            from.resetStack(toBeRemoved, [
                TypedTransition.createRoute(GenericDashboardView, {
                    individualUUID: individualUUID,
                    encounter: encounter,
                    message,
                    backFunction: backFn,
                    tab: 3,
                }, true)
            ]);
        } else {
            from.with({individualUUID: individualUUID, backFunction: backFn, tab: 3}).to(GenericDashboardView, true);
        }
    }

    static navigateToExitProgram(source, enrolment, workLists, editing = false, pageNumber) {
        TypedTransition.from(source).with({enrolment, workLists, editing, pageNumber}).to(ProgramExitView);
    }

    static navigateToStartEncounterPage(source, enrolmentUUID, allowedEncounterTypeUuids) {
        TypedTransition.from(source).with({
            enrolmentUUID: enrolmentUUID,
            allowedEncounterTypeUuids: allowedEncounterTypeUuids
        }).to(NewVisitPageView);
    }

    static goBack(source) {
        TypedTransition.from(source).goBack()
    }

    static navigateToProgramEncounterView(source, programEncounter, editing = false, encounterTypeName, enrolmentUUID, message, backFn, onSaveCallback, pageNumber) {
        TypedTransition.from(source).with({
            programEncounter: programEncounter,
            editing,
            encounterTypeName,
            enrolmentUUID,
            message,
            backFunction: backFn,
            onSaveCallback,
            pageNumber
        }).to(ProgramEncounterView);
    }

    static navigateToChecklistItemView(source, checklistItem) {
        TypedTransition.from(source).with({checklistItem: checklistItem}).to(ChecklistItemView);
    }

    static navigateToProgramEncounterCancelView(source, programEncounter, editing = false, pageNumber) {
        TypedTransition.from(source).with({
            programEncounter: programEncounter,
            editing,
            pageNumber
        }).to(ProgramEncounterCancelView);
    }

    static navigateToIndividualRegistrationDetails(source, individualUUID, backFunction) {
        TypedTransition.from(source).with({
            individualUUID: individualUUID,
            backFunction: backFunction,
            tab: 1
        }).to(GenericDashboardView);
    }

    static navigateToRegisterView(source, {workLists, groupSubjectUUID, taskUuid}, pageNumber, canMoveToNextView) {
        const workItem = workLists.getCurrentWorkItem();
        const uuid = workItem.parameters.uuid;
        const subjectTypeName = workItem.parameters.subjectTypeName;
        const subjectType = source.context.getService(EntityService).findByKey('name', subjectTypeName, SubjectType.schema.name);
        const params = {
            subjectUUID: uuid,
            individualUUID: uuid,
            groupSubjectUUID,
            taskUuid,
            editing: !_.isNil(uuid),
            workLists,
        };
        if (subjectType.isPerson()) {
            if (PersonRegisterView.canLoad({uuid, subjectTypeName}, source)) {
                if (pageNumber > 0 && canMoveToNextView) {
                    TypedTransition.from(source).resetStack([], [
                        TypedTransition.createRoute(PersonRegisterView, params),
                        TypedTransition.createRoute(PersonRegisterFormView, {...params, pageNumber: pageNumber + 1})
                    ]);
                } else {
                    TypedTransition.from(source).with({...params}).to(PersonRegisterView)
                }
            }
        } else if (SubjectRegisterView.canLoad({uuid, subjectTypeName}, source)) {
            TypedTransition.from(source).with({...params, pageNumber}).to(SubjectRegisterView)
        }
    }

    static navigateToIndividualEncounterLandingView(source, individualUUID, encounter, editing = false, pageNumber) {
        const params = {
            encounter: encounter,
            individualUUID: individualUUID,
            editing
        };
        TypedTransition.from(source).bookmark().with({
            ...params,
            pageNumber
        }).to(IndividualEncounterView, true);
    }

    static navigateToSystemRecommendationViewFromEncounterWizard(source, decisions, ruleValidationErrors, encounter, action, headerMessage, form, workListState, message, nextScheduledVisits, popVerificationVew, isRejectedEntity, entityApprovalStatus, fromSDV) {
        const onSaveCallback = (source) => {
            TypedTransition
                .from(source)
                .resetStack([SystemRecommendationView, IndividualEncounterView, GenericDashboardView], [
                    TypedTransition.createRoute(GenericDashboardView, {
                        individualUUID: encounter.individual.uuid, message, tab: 3
                    }, true)
                ]);
        };

        let onPreviousCallback = undefined;
        if (fromSDV) {
            onPreviousCallback = (context) => {
                const form = context.getService(FormMappingService).findFormForEncounterType(encounter.encounterType, Encounter.schema.name, encounter.subjectType);
                let pageNumber = form.numberOfPages + 1;
                const lastGroupWithAtLeastOneVisibleElement = _.findLast(form.getFormElementGroups(),
                    (formElementGroup) => {
                        pageNumber = pageNumber - 1;
                        let formElementStatuses = context.getService(RuleEvaluationService).getFormElementsStatuses(encounter, Encounter.schema.name, formElementGroup);
                        let elements = formElementGroup.filterElements(formElementStatuses);
                        return !_.isEmpty(elements);
                    });

                TypedTransition.from(source).with({
                    encounter,
                    individualUUID: encounter.individual.uuid,
                    editing: true,
                    pageNumber
                }).to(IndividualEncounterView, true);
            }
        }

        CHSNavigator.navigateToSystemsRecommendationView(source,
            decisions,
            ruleValidationErrors,
            encounter.individual,
            encounter.observations,
            action,
            onSaveCallback,
            headerMessage,
            null,
            nextScheduledVisits,
            form,
            workListState,
            message,
            false,
            popVerificationVew,
            isRejectedEntity,
            entityApprovalStatus,
            onPreviousCallback
        );
    }

    static navigateToSystemsRecommendationView(source, decisions, validationErrors, individual, observations, saveActionName, onSaveCallback, headerMessage, checklists, nextScheduledVisits, form, workListState, message, isSaveDraftOn, popVerificationVew, isRejectedEntity, entityApprovalStatus, onPreviousCallback) {
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
            workListState,
            isSaveDraftOn,
            isRejectedEntity,
            entityApprovalStatus,
            onPreviousCallback
        }).to(SystemRecommendationView, true, popVerificationVew);
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

    static navigateToSetPasswordView(source, user, onSuccessCB) {
        TypedTransition.from(source).with({user, onSuccessCB}).to(SetPasswordView, true);
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

    static navigateToAddMemberView(source, individual) {
        TypedTransition.from(source).with({
            groupSubject: individual,
        }).to(AddNewMemberView, true);
    }

    static navigateToFamilyDashboardView(source, familyUUID) {
        TypedTransition.from(source).with({familyUUID: familyUUID}).to(FamilyDashboardView, true);
    }

    static navigateToVideoPlayerView(source, props) {
        TypedTransition.from(source).with(props).to(VideoPlayerView, true);
    }

    static onSaveGoToProgramEnrolmentDashboardView(recommendationsView, individualUUID, message) {
        const toBeRemoved = [SystemRecommendationView, PersonRegisterFormView, PersonRegisterView, SubjectRegisterView, AddNewMemberView];
        TypedTransition
            .from(recommendationsView)
            .resetStack(toBeRemoved, [
                TypedTransition.createRoute(GenericDashboardView, {
                    individualUUID,
                    message: recommendationsView.I18n.t(message || "registrationSavedMsg"),
                    tab: 1
                }, true)
            ]);
    }

    static getMessage(i18n, workItem: WorkItem) {
        const args = {programName: workItem.parameters.programName, encounterName: workItem.parameters.encounterType};
        const tkey = new Map([
            [WorkItem.type.REGISTRATION, 'registrationSavedMsg'],
            [WorkItem.type.PROGRAM_ENROLMENT, 'enrolmentSavedMsg'],
            [WorkItem.type.PROGRAM_ENCOUNTER, 'encounterSavedMsg'],
            [WorkItem.type.CANCELLED_ENCOUNTER, 'encounterCancelledMsg'],
            [WorkItem.type.ENCOUNTER, 'encounterSavedMsg'],
            [WorkItem.type.ADD_MEMBER, 'newMemberAddedMsg'],
            [WorkItem.type.PROGRAM_EXIT, 'enrolmentExitMsg'],
            [WorkItem.type.HOUSEHOLD, 'proceedAddHousehold'],
            [WorkItem.type.REMOVE_MEMBER, 'proceedRemoveMember'],
        ]).get(workItem.type);
        if (tkey) {
            return i18n.t(tkey, args);
        }
        throw new Error(`Invalid WorkItemType '${workItem.type}'`);
    }

    static performNextWorkItemFromRecommendationsView(recommendationsView, workListState: WorkListState, context) {
        const currentWorkItem = workListState.currentWorkItem;
        const message = this.getMessage(recommendationsView.I18n, currentWorkItem);
        const nextWorkItem = workListState.moveToNextWorkItem();

        const toBePoped = [
            SystemRecommendationView,
            PersonRegisterFormView,
            PersonRegisterView,
            SubjectRegisterView,
            ProgramEncounterView,
            ProgramEnrolmentView,
            AddNewMemberView,
            ProgramExitView
        ];
        switch (nextWorkItem.type) {
            case WorkItem.type.REGISTRATION: {
                const uuid = nextWorkItem.parameters.uuid;
                const subjectType = context.getService(EntityService).findByKey('name', nextWorkItem.parameters.subjectTypeName, SubjectType.schema.name);
                const target = subjectType.isPerson() ? PersonRegisterView : SubjectRegisterView;
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
                        TypedTransition.createRoute(GenericDashboardView, {individualUUID: nextWorkItem.parameters.subjectUUID}, true),
                        TypedTransition.createRoute(ProgramEnrolmentView, {
                            enrolment: enrolment,
                            workLists: workListState.workLists,
                            message: message,
                            tab: 2
                        }, true)
                    ]);
                break;
            }
            case WorkItem.type.REMOVE_MEMBER: {
                const groupSubject = context.getService(GroupSubjectService).findByUUID(nextWorkItem.parameters.groupSubjectUUID);
                TypedTransition.from(recommendationsView)
                    .resetStack(toBePoped, [
                        TypedTransition.createRoute(RemoveMemberView, {groupSubject, goToMemberDashboard: true})
                    ]);
                break;
            }
            case WorkItem.type.HOUSEHOLD: {
                const {totalMembers, message, groupSubjectUUID, currentMember} = nextWorkItem.parameters;
                const subjectUUID = groupSubjectUUID ? groupSubjectUUID : currentWorkItem.parameters.subjectUUID;
                const individual = context.getService(IndividualService).findByUUID(subjectUUID);
                TypedTransition.from(recommendationsView)
                    .resetStack([...toBePoped, GenericDashboardView], [
                        TypedTransition.createRoute(GenericDashboardView, {individualUUID: subjectUUID}, true),
                        TypedTransition.createRoute(AddNewMemberView, {
                            groupSubject: individual,
                            workLists: workListState.workLists,
                            totalMembers: +totalMembers,
                            message,
                            currentMember
                        }, true)
                    ]);
                break;
            }
            case WorkItem.type.ADD_MEMBER: {
                const individual = context.getService(IndividualService).findByUUID(nextWorkItem.parameters.groupSubjectUUID);
                TypedTransition.from(recommendationsView)
                    .resetStack([...toBePoped, GenericDashboardView], [
                        TypedTransition.createRoute(GenericDashboardView, {individualUUID: nextWorkItem.parameters.groupSubjectUUID}, true),
                        TypedTransition.createRoute(AddNewMemberView, {
                            groupSubject: individual,
                            message: message,
                            workLists: workListState.workLists,
                        }, true)
                    ]);
                break;
            }
            case WorkItem.type.PROGRAM_ENCOUNTER: {
                let programEncounter;
                if (_.isEmpty(nextWorkItem.parameters.uuid)) {
                    const {programEnrolmentUUID, encounterType, name} = nextWorkItem.parameters;
                    const enrolment = context.getService(ProgramEnrolmentService).findByUUID(programEnrolmentUUID);
                    const programEncounterService = context.getService(ProgramEncounterService);
                    //Use a due encounter if available
                    const dueEncounter = programEncounterService.findDueEncounter({
                        enrolmentUUID: programEnrolmentUUID,
                        encounterTypeName: encounterType,
                        encounterName: name
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
                        TypedTransition.createRoute(GenericDashboardView, {individualUUID: nextWorkItem.parameters.subjectUUID}, true),
                        TypedTransition.createRoute(ProgramEncounterView, {
                            params: {
                                enrolmentUUID: programEncounter.programEnrolment.uuid,
                                encounterType: nextWorkItem.parameters.encounterType,
                                workLists: workListState.workLists,
                                message: message,
                                programEncounter,
                                editing: false,
                                tab: 2
                            }
                        }, true)
                    ]);
                break;
            }
            case WorkItem.type.ENCOUNTER: {
                let encounter;
                if (_.isEmpty(nextWorkItem.parameters.uuid)) {
                    const {subjectUUID, encounterType} = nextWorkItem.parameters;
                    const subject = context.getService(IndividualService).findByUUID(subjectUUID);
                    const encounterService = context.getService(EncounterService);
                    //Use a due encounter if available
                    const dueEncounter = encounterService.findDueEncounter({
                        individualUUID: subjectUUID,
                        encounterTypeName: encounterType
                    });
                    if (dueEncounter) {
                        encounter = dueEncounter.cloneForEdit();
                        encounter.encounterDateTime = new Date();
                    } else {
                        encounter = Encounter.createEmptyInstance();
                        encounter.encounterType = context.getService(EntityService).findByKey('name', encounterType, EncounterType.schema.name);
                        encounter.individual = subject;
                    }
                } else {
                    encounter = context.getService(EncounterService).findByUUID(nextWorkItem.parameters.uuid).cloneForEdit();
                    encounter.encounterDateTime = encounter.encounterDateTime || new Date();
                }
                TypedTransition.from(recommendationsView)
                    .resetStack(toBePoped, [
                        TypedTransition.createRoute(GenericDashboardView, {individualUUID: nextWorkItem.parameters.subjectUUID}, true),
                        TypedTransition.createRoute(IndividualEncounterView, {
                            individualUUID: nextWorkItem.parameters.subjectUUID,
                            encounterType: nextWorkItem.parameters.encounterType,
                            workLists: workListState.workLists,
                            message: message,
                            editing: false,
                            encounter,
                            tab: 2
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
        TypedTransition.from(source)
            .resetStack([GenericDashboardView, ProgramEncounterView, SystemRecommendationView], [
                TypedTransition.createRoute(GenericDashboardView, props, true)
            ]);
    }

    static navigateToBeneficiaryIdentificationPage(source) {
        TypedTransition.from(source).toBeginning().to(BeneficiaryIdentificationPage, true, true);
    }

    static navigateToEncounterView(source, params) {
        const encounter = params.encounter;
        const editing = params.editing || false;
        const backFunction = params.backFunction;
        const isCancelPage = encounter.isCancelled() || params.cancel;
        const eventName = encounter instanceof Encounter ? 'EDIT_ENCOUNTER' : 'EDIT_PROGRAM_ENCOUNTER';
        editing && logEvent(firebaseEvents[eventName]);
        if (isCancelPage) {
            CHSNavigator.navigateToProgramEncounterCancelView(source, encounter, editing, params.pageNumber);
        } else if (encounter instanceof Encounter) {
            CHSNavigator.navigateToIndividualEncounterLandingView(
                source, params.individualUUID, encounter, editing, params.pageNumber);
        } else {
            CHSNavigator.navigateToProgramEncounterView(
                source, encounter, editing, null, null, null, backFunction, params.onSaveCallback, params.pageNumber);
        }
    }

    static proceedEncounter(typeorencounter, parent, onSaveCallback, source) {
        const selectedEncounter = typeorencounter instanceof EncounterType
            ? parent instanceof Individual
                ? Encounter.createScheduled(typeorencounter, parent)
                : ProgramEncounter.createScheduled(typeorencounter, parent)
            : typeorencounter;
        const encounter = selectedEncounter.cloneForEdit();
        encounter.encounterDateTime = moment().toDate();
        CHSNavigator.navigateToEncounterView(source, {
            encounter,
            onSaveCallback: onSaveCallback,
        });
    }
}

export default CHSNavigator;
