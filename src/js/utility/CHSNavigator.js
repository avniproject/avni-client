import TypedTransition from "../framework/routing/TypedTransition";
import ProgramEnrolmentView from "../views/program/ProgramEnrolmentView";
import ProgramEnrolmentDashboardView from "../views/program/ProgramEnrolmentDashboardView";
import ProgramExitView from "../views/program/ProgramExitView";
import ProgramEnrolmentState from '../action/prorgam/ProgramEnrolmentState';

class CHSNavigator {
    static navigateToProgramEnrolmentView(source, enrolment) {
        TypedTransition.from(source).with({enrolment: enrolment}).to(ProgramEnrolmentView);
    }

    static navigateToProgramEnrolmentDashboardView(source, enrolmentUUID, usage) {
        TypedTransition.from(source).wizardCompleted(ProgramEnrolmentView, usage === ProgramEnrolmentState.UsageKeys.Enrol ? ProgramEnrolmentDashboardView : ProgramExitView, {enrolmentUUID: enrolmentUUID});
    }

    static navigateToExitProgram(source, enrolment) {
        TypedTransition.from(source).with({enrolment: enrolment}).to(ProgramExitView);
    }
}

export default CHSNavigator;