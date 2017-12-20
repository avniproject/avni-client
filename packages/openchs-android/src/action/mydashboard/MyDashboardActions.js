import EntityService from "../../service/EntityService";
import {AddressLevel, Program, Individual} from "openchs-models";
import _ from 'lodash';
import IndividualService from "../../service/IndividualService";
import EncounterType from "../../../../openchs-models/src/EncounterType";

const PAGE_SIZE = 20;

class MyDashboardActions {
    static getInitialState() {
        return {visits: {}, individuals: {begin: 0, end: PAGE_SIZE, data: []}};
    }


    static clone(state) {
        return {};
    }

    static onLoad(state, action, context) {
        const entityService = context.get(EntityService);
        const individualService = context.get(IndividualService);
        const allAddressLevels = entityService.getAll(AddressLevel.schema.name);
        const nameAndID = ({name, uuid}) => ({name, uuid});
        const results = {};
        allAddressLevels.map((addressLevel) => {
            let existingResultForAddress = {
                address: nameAndID(addressLevel),
                visits: {
                    scheduled: {count: 0, abnormal: false},
                    overdue: {count: 0, abnormal: false},
                    completed: {count: 0, abnormal: false},
                    highRisk: {count: 0, abnormal: true}
                },
                ...results[addressLevel.uuid],
            };
            existingResultForAddress.visits.scheduled.count += individualService.allScheduledVisitsCount(addressLevel);
            existingResultForAddress.visits.overdue.count += individualService.allOverdueVisitsCount(addressLevel);
            existingResultForAddress.visits.completed.count += individualService.allCompletedVisitsCount(addressLevel, new Date(), new Date());
            existingResultForAddress.visits.highRisk.count += individualService.allHighRiskPatientCount(addressLevel);
            results[addressLevel.uuid] = existingResultForAddress;
        });

        return {...state, visits: results};
    }

    static onListLoad(state, action, context) {
        const individualService = context.get(IndividualService);
        const methodMap = new Map([
            ["scheduled", individualService.allScheduledVisitsIn],
            ["overdue", individualService.allOverdueVisitsIn],
            ["completed", individualService.allCompletedVisitsIn],
            ["highRisk", individualService.allHighRiskPatients]
        ]);
        const individuals = [...state.individuals.data,
            ...methodMap.get(action.listType)(action.address, new Date(), new Date())
                .slice(state.individuals.begin, state.individuals.end)];
        console.log(state.individuals.begin);
        console.log(state.individuals.end);
        return {
            ...state,
            individuals: {
                begin: state.individuals.begin + PAGE_SIZE,
                end: state.individuals.end + PAGE_SIZE,
                data: individuals
            }
        };
    }
}

const MyDashboardPrefix = "MyD";

const MyDashboardActionNames = {
    ON_LOAD: `${MyDashboardPrefix}.ON_LOAD`,
    ON_LIST_LOAD: `${MyDashboardPrefix}.ON_LIST_LOAD`
};

const MyDashboardActionsMap = new Map([
    [MyDashboardActionNames.ON_LOAD, MyDashboardActions.onLoad],
    [MyDashboardActionNames.ON_LIST_LOAD, MyDashboardActions.onListLoad],
]);

export {
    MyDashboardActions,
    MyDashboardActionsMap,
    MyDashboardActionNames,
    MyDashboardPrefix
};