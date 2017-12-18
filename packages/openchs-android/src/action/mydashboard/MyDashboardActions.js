import EntityService from "../../service/EntityService";
import {AddressLevel, Program, Individual} from "openchs-models";
import IndividualService from "../../service/IndividualService";
import EncounterType from "../../../../openchs-models/src/EncounterType";

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
        const allEncounterTypes = entityService.getAll(EncounterType.schema.name);
        const addressLevels = {};
        programs.map((program) => {
            allEncounterTypes.map((encounterType) => {
                allAddressLevels.map((addressLevel) => {
                    const individualAggregates = {};
                    individualAggregates.scheduled = individualService.totalScheduledVisits(program, addressLevel, encounterType);
                    individualAggregates.overdue = individualService.totalOverdueVisits(program, addressLevel, encounterType);
                    individualAggregates.completed = individualService.totalCompletedVisits(program, addressLevel, encounterType, new Date());
                    individualAggregates.highRisk = individualService.totalHighRisk(program, addressLevel, encounterType);
                    addressLevels[addressLevel.name] = individualAggregates;
                });
            })
        });
        console.log(addressLevels);
        return {addressLevels: addressLevels};
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
    MyDashboardActionNames,
    MyDashboardPrefix
};