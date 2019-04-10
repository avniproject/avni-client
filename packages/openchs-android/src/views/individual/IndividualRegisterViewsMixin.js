import TypedTransition from "../../framework/routing/TypedTransition";
import IndividualRegisterFormView from "./IndividualRegisterFormView";
import {Actions} from "../../action/individual/IndividualRegisterActions";
import IndividualRegisterView from "./IndividualRegisterView";
import CHSNavigator from "../../utility/CHSNavigator";
import SystemRecommendationView from "../conclusion/SystemRecommendationView";
import AbstractDataEntryState from "../../state/AbstractDataEntryState";
import {BaseEntity,ProgramEnrolment} from 'openchs-models';
import ProgramEnrolmentDashboardView from "../program/ProgramEnrolmentDashboardView";
import SubjectRegisterView from "../subject/SubjectRegisterView";
import ProgramEnrolmentView from "../program/ProgramEnrolmentView";

class Mixin {
    static next(view) {
        if (view.scrollToTop)
            view.scrollToTop();

        const {stitches} = view.props.params;

        view.dispatchAction(Actions.NEXT, {
            completed: (state, decisions, ruleValidationErrors, checklists, nextScheduledVisits, context) => {
                const onSaveCallback = ((source) => {
                    Mixin.onSaveGoToProgramEnrolmentDashboardView(source, view.state.individual.uuid);
                });
                const headerMessage = `${view.I18n.t('registration', {type: view.registrationType})} - ${view.I18n.t('summaryAndRecommendations')}`;
                CHSNavigator.navigateToSystemsRecommendationView(view, decisions, ruleValidationErrors, view.state.individual, state.individual.observations, Actions.SAVE, onSaveCallback, headerMessage, null, null, null, stitches);
            },
            movedNext: (state) => {
                if (state.wizard.isFirstFormPage())
                    TypedTransition.from(view).with({stitches}).to(IndividualRegisterFormView);
            },
            validationFailed: (newState) => {
                if (AbstractDataEntryState.hasValidationError(view.state, BaseEntity.fieldKeys.EXTERNAL_RULE)) {
                    view.showError(newState.validationResults[0].message);
                }
            }
        });
    }

    static onSaveGoToProgramEnrolmentDashboardView(recommendationsView, individualUUID) {
        TypedTransition
            .from(recommendationsView)
            .wizardCompleted([SystemRecommendationView, IndividualRegisterFormView, IndividualRegisterView],
                ProgramEnrolmentDashboardView, {individualUUID, message: recommendationsView.I18n.t("registrationSavedMsg")}, true,);
    }

    static navigateToRegistration(source, subjectType) {
        const stitches = {label: source.I18n.t('anotherRegistration', {subject: subjectType.name})};
        const target = subjectType.isIndividual()? IndividualRegisterView: SubjectRegisterView;
        stitches.fn = (recommendationsView) => {
            TypedTransition
                .from(recommendationsView)
                .wizardCompleted([SystemRecommendationView, IndividualRegisterFormView],
                    target, {params: {stitches}, message : source.I18n.t('registrationSavedMsg')}, true);
        };
        CHSNavigator.navigateToRegisterView(source, null, stitches, subjectType);
    }

    static navigateToRegistrationThenProgramEnrolmentView(source, program, goBackTo, subjectType) {
        CHSNavigator.navigateToRegisterView(source, null, {
            registrationType: program.displayName,
            label: source.I18n.t('saveAndEnrol'),
            fn: recommendationView => Mixin.navigateToProgramEnrolmentView(goBackTo, recommendationView.props.individual, program, source.I18n.t('registrationSavedMsg'))
        }, subjectType);
    }

    static navigateToProgramEnrolmentView(source, individual, program,message) {
        TypedTransition.from(source).wizardCompleted(
            [SystemRecommendationView, IndividualRegisterFormView, IndividualRegisterView],
            ProgramEnrolmentView, {enrolment: ProgramEnrolment.createEmptyInstance({individual, program}),message}, true);
    }

}

export default Mixin;
