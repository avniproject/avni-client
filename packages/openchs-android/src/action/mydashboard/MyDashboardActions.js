import EntityService from "../../service/EntityService";
import {AddressLevel, Program, Individual} from "openchs-models";
import _ from 'lodash';
import IndividualService from "../../service/IndividualService";
import EncounterType from "../../../../openchs-models/src/EncounterType";

class MyDashboardActions {
    static getInitialState() {
        return {visits: {}};
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
        const nameAndID = ({name, uuid}) => ({name, uuid});
        const results = {};
        allAddressLevels.map((addressLevel) => {
            programs.map((program) => {
                allEncounterTypes.map((encounterType) => {
                    let existingResultForAddress = Object.assign({
                        address: nameAndID(addressLevel),
                        visits: {
                            scheduled: {count: 0, abnormal: false},
                            overdue: {count: 0, abnormal: false},
                            completed: {count: 0, abnormal: false},
                            highRisk: {count: 0, abnormal: true}
                        },
                    }, results[addressLevel.uuid]);
                    existingResultForAddress.visits.scheduled.count += individualService.totalScheduledVisits(program, addressLevel, encounterType);
                    existingResultForAddress.visits.overdue.count += individualService.totalOverdueVisits(program, addressLevel, encounterType);
                    existingResultForAddress.visits.completed.count += individualService.totalCompletedVisits(program, addressLevel, encounterType, new Date(), new Date());
                    results[addressLevel.uuid] = existingResultForAddress;
                });
                results[addressLevel.uuid].visits.highRisk.count = results[addressLevel.uuid].visits.highRisk.count +
                    individualService.totalHighRisk(program, addressLevel);
            })

        });

        return {visits: results};
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