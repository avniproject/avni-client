import TypedTransition from "../framework/routing/TypedTransition";
import ProgramEnrolmentView from "../views/program/ProgramEnrolmentView";
import ProgramEnrolmentDashboardView from "../views/program/ProgramEnrolmentDashboardView";
import ProgramExitView from "../views/program/ProgramExitView";
import ProgramEnrolmentState from '../action/prorgam/ProgramEnrolmentState';
import _ from 'lodash';

class CHSNavigator {
    static navigateToProgramEnrolmentView(source, enrolment) {
        TypedTransition.from(source).with({enrolment: enrolment}).to(ProgramEnrolmentView);
    }

    static navigateToProgramEnrolmentDashboardView(source, individualUUID, selectedEnrolmentUUID, usage) {
        const from = TypedTransition.from(source);
        if (_.isNil(usage)) {
            from.with({individualUUID: individualUUID}).to(ProgramEnrolmentDashboardView);
        } else {
            const wizardViewClass = usage === ProgramEnrolmentState.UsageKeys.Enrol ? ProgramEnrolmentView : ProgramExitView;
            from.wizardCompleted(wizardViewClass, ProgramEnrolmentDashboardView, {individualUUID: individualUUID, enrolmentUUID: selectedEnrolmentUUID});
        }
    }

    static navigateToExitProgram(source, enrolment) {
        TypedTransition.from(source).with({enrolment: enrolment}).to(ProgramExitView);
    }
}

export default CHSNavigator;