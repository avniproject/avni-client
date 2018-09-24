import EntityService from "../../service/EntityService";
import {AddressLevel, Program, Individual} from "openchs-models";
import _ from 'lodash';
import IndividualService from "../../service/IndividualService";
import EncounterType from "../../../../openchs-models/src/EncounterType";

class MyDashboardActions {
    static getInitialState() {
        return {visits: {}, individuals: {data: []}, date: {value: new Date()}};
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
        const individualsWithScheduledVisits = _.groupBy(individualService.allScheduledVisitsIn(state.date.value), 'addressUUID');
        const individualsWithOverdueVisits = _.groupBy(individualService.allOverdueVisitsIn(state.date.value), 'addressUUID');
        const individualsWithCompletedVisits = _.groupBy(individualService.allCompletedVisitsIn(state.date.value), 'addressUUID');
        const allIndividuals = _.groupBy(individualService.allIn(state.date.value), 'addressUUID');
        allAddressLevels.map((addressLevel) => {
            const address = nameAndID(addressLevel);
            let existingResultForAddress = {
                address: address,
                visits: {
                    scheduled: {count: 0, abnormal: false},
                    overdue: {count: 0, abnormal: false},
                    completedVisits: {count: 0, abnormal: false},
                    total: {count: 0, abnormal: true}
                },
                ...results[addressLevel.uuid],
            };
            existingResultForAddress.visits.scheduled.count = _.get(individualsWithScheduledVisits, addressLevel.uuid, []).length;
            existingResultForAddress.visits.overdue.count = _.get(individualsWithOverdueVisits, addressLevel.uuid, []).length;
            existingResultForAddress.visits.completedVisits.count = _.get(individualsWithCompletedVisits, addressLevel.uuid, []).length;
            existingResultForAddress.visits.total.count = _.get(allIndividuals, addressLevel.uuid, []).length;
            results[addressLevel.uuid] = existingResultForAddress;
        });
        return {...state, visits: results};
    }

    static onListLoad(state, action, context) {
        const individualService = context.get(IndividualService);
        const methodMap = new Map([
            ["scheduled", individualService.allScheduledVisitsIn],
            ["overdue", individualService.allOverdueVisitsIn],
            ["completedVisits", individualService.allCompletedVisitsIn],
            ["total", individualService.allIn]
        ]);
        const allIndividuals = methodMap.get(action.listType)(state.date.value, action.address)
            .map(({uuid}) => individualService.findByUUID(uuid));
        return {
            ...state,
            individuals: {
                data: [...allIndividuals],
            }
        };
    }

    static onDate(state, action, context) {
        return MyDashboardActions.onLoad({...state, date: {value: action.value}}, action, context);
    }


    static resetList(state, action, context) {
        return {
            ...state,
            individuals: {
                data: [],
            }
        }
    }
}

const MyDashboardPrefix = "MyD";

const MyDashboardActionNames = {
    ON_LOAD: `${MyDashboardPrefix}.ON_LOAD`,
    ON_LIST_LOAD: `${MyDashboardPrefix}.ON_LIST_LOAD`,
    RESET_LIST: `${MyDashboardPrefix}.RESET_LIST`,
    ON_DATE: `${MyDashboardPrefix}.ON_DATE`
};

const MyDashboardActionsMap = new Map([
    [MyDashboardActionNames.ON_DATE, MyDashboardActions.onDate],
    [MyDashboardActionNames.ON_LOAD, MyDashboardActions.onLoad],
    [MyDashboardActionNames.ON_LIST_LOAD, MyDashboardActions.onListLoad],
    [MyDashboardActionNames.RESET_LIST, MyDashboardActions.resetList],
]);

export {
    MyDashboardActions,
    MyDashboardActionsMap,
    MyDashboardActionNames,
    MyDashboardPrefix
};