import ProgramEnrolmentService from "../../service/ProgramEnrolmentService";
import EntityService from "../../service/EntityService";
import {Program} from 'openchs-models';

class DashboardActions {
    static getInitialState() {
        return {};
    }

    static clone(state) {
        return {};
    }

    static onLoad(state, action, context) {
        const newState = DashboardActions.clone();
        const programEnrolmentService = context.get(ProgramEnrolmentService);
        const programs = context.get(EntityService).getAll(Program.schema.name);

        newState.programs = [];
        programs.forEach((program) => {
            newState.programs.push(programEnrolmentService.getProgramReport(program));
        });

        return newState;
    }
}

const DashboardActionNames = {
    ON_LOAD: 'D.ON_LOAD'
};

const DashboardActionsMap = new Map([
    [DashboardActionNames.ON_LOAD, DashboardActions.onLoad]
]);

export {
    DashboardActionNames,
    DashboardActionsMap,
    DashboardActions
};