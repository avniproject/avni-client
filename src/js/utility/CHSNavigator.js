import TypedTransition from "../framework/routing/TypedTransition";
import ProgramEnrolmentView from "../views/program/ProgramEnrolmentView";
import ProgramEnrolmentDashboardView from "../views/program/ProgramEnrolmentDashboardView";
import ProgramExitView from "../views/program/ProgramExitView";

class CHSNavigator {
    static navigateToProgramEnrolmentView(source, enrolment) {
        TypedTransition.from(source).with({enrolment: enrolment}).to(ProgramEnrolmentView);
    }

    static navigateToProgramEnrolmentDashboardView(source, enrolmentUUID) {
        TypedTransition.from(source).wizardCompleted(ProgramEnrolmentView, ProgramEnrolmentDashboardView, {enrolmentUUID: enrolmentUUID});
    }

    static navigateToExitProgram(source, enrolment) {
        TypedTransition.from(source).with({enrolment: enrolment}).to(ProgramExitView);
    }
}

export default CHSNavigator;