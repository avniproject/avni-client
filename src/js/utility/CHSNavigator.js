import TypedTransition from "../framework/routing/TypedTransition";
import ProgramEnrolmentView from "../views/program/ProgramEnrolmentView";
import ProgramEnrolmentDashboardView from "../views/program/ProgramEnrolmentDashboardView";

class CHSNavigator {
    static navigateToProgramEnrolmentView(source, enrolment) {
        TypedTransition.from(source).with({enrolment: enrolment}).to(ProgramEnrolmentView);
    }

    static navigateToProgramEnrolmentDashboardView(source, enrolmentUUID) {
        TypedTransition.from(source).wizardCompleted(ProgramEnrolmentView, ProgramEnrolmentDashboardView, {enrolmentUUID: enrolmentUUID});
    }
}

export default CHSNavigator;