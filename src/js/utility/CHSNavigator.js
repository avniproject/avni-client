import TypedTransition from "../framework/routing/TypedTransition";
import ProgramEnrolmentView from "../views/program/ProgramEnrolmentView";

class CHSNavigator {
    static navigateToProgramEnrolmentView(source, enrolment) {
        TypedTransition.from(source).with({enrolment: enrolment, baseView: source.constructor}).to(ProgramEnrolmentView);
    }
}

export default CHSNavigator;