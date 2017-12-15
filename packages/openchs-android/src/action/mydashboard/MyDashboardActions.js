import EntityService from "../../service/EntityService";
import {AddressLevel, Program, Individual} from "openchs-models";
import IndividualService from "../../service/IndividualService";

class MyDashboardActions {
    static getInitialState() {
        return {filters: [], areas: []};
    }


    static clone(state) {
        return {};
    }

    static onLoad(state, action, context) {
        const entityService = context.get(EntityService);
        const individualService = context.get(IndividualService);
        const programs = entityService.getAll(Program.schema.name);
        const allAddressLevels = entityService.getAll(AddressLevel.schema.name);
        // const individualsEnrolled = individualService.numberOfIndividualsWithScheduledVisits();
        // individualsEnrolled.filter()
        return {filters: [], addressLevels: []};
    }
}

const MyDashboardPrefix = "MyD";

const MyDashboardActionNames = {
    ON_LOAD: `${MyDashboardPrefix}.ON_LOAD`,
};

const MyDashboardActionsMap = new Map([
    [MyDashboardActionNames.ON_LOAD, MyDashboardActions.onLoad],
]);

export {
    MyDashboardActions,
    MyDashboardActionsMap,
    MyDashboardPrefix
};