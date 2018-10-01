import EntityService from "../../service/EntityService";
import {AddressLevel} from "openchs-models";
import _ from 'lodash';
import IndividualService from "../../service/IndividualService";
import FilterService from "../../service/FilterService";

class MyDashboardActions {
    static getInitialState() {
        return {
            visits: {},
            individuals: {data: []},
            date: {value: new Date()},
            showFilters: false,
            filters: new Map()
        };
    }


    static clone(state) {
        return {};
    }

    static applyFilters(filters) {
        return (individuals) => [...filters.values()]
            .reduce((acc, f) => f.compositeFn(acc), individuals);
    }

    static onLoad(state, action, context) {
        const entityService = context.get(EntityService);
        const individualService = context.get(IndividualService);
        const allAddressLevels = entityService.getAll(AddressLevel.schema.name);
        const nameAndID = ({name, uuid}) => ({name, uuid});
        const results = {};
        let filters = MyDashboardActions.cloneFilters(state.filters);
        if (state.filters.size === 0) {
            const filterService = context.get(FilterService);
            filters = filterService.getAllFilters().reduce((acc, f) => acc.set(f.label, f), new Map());
        }
        const [allIndividualsWithScheduledVisits,
            allIndividualsWithOverDueVisits,
            allIndividualsWithCompletedVisits,
            allIndividuals] =
            [individualService.allScheduledVisitsIn(state.date.value),
                individualService.allOverdueVisitsIn(state.date.value),
                individualService.allCompletedVisitsIn(state.date.value),
                individualService.allIn(state.date.value)].map(MyDashboardActions.applyFilters(filters));
        const individualsWithScheduledVisits = _.groupBy(allIndividualsWithScheduledVisits, 'addressUUID');
        const individualsWithOverdueVisits = _.groupBy(allIndividualsWithOverDueVisits, 'addressUUID');
        const individualsWithCompletedVisits = _.groupBy(allIndividualsWithCompletedVisits, 'addressUUID');
        const allIndividualsGrouped = _.groupBy(allIndividuals, 'addressUUID');
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
            existingResultForAddress.visits.total.count = _.get(allIndividualsGrouped, addressLevel.uuid, []).length;
            results[addressLevel.uuid] = existingResultForAddress;
        });
        return {...state, visits: results, filters: filters};
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
                data: MyDashboardActions.applyFilters(state.filters)([...allIndividuals]),
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

    static onFilters(state) {
        return {...state, showFilters: !state.showFilters};
    }

    static cloneFilters(filters) {
        return [...filters.entries()].reduce((acc, [l, f]) => acc.set(l, f.clone()), new Map());
    }

    static addFilter(state, action, context) {
        const newFilters = MyDashboardActions.cloneFilters(state.filters.set(action.filter.label, action.filter));
        return {...state, filters: newFilters};
    }
}

const MyDashboardPrefix = "MyD";

const MyDashboardActionNames = {
    ON_LOAD: `${MyDashboardPrefix}.ON_LOAD`,
    ON_LIST_LOAD: `${MyDashboardPrefix}.ON_LIST_LOAD`,
    RESET_LIST: `${MyDashboardPrefix}.RESET_LIST`,
    ON_DATE: `${MyDashboardPrefix}.ON_DATE`,
    ON_FILTERS: `${MyDashboardPrefix}.ON_FILTERS`,
    ADD_FILTER: `${MyDashboardPrefix}.ADD_FILTER`
};

const MyDashboardActionsMap = new Map([
    [MyDashboardActionNames.ON_DATE, MyDashboardActions.onDate],
    [MyDashboardActionNames.ON_LOAD, MyDashboardActions.onLoad],
    [MyDashboardActionNames.ON_LIST_LOAD, MyDashboardActions.onListLoad],
    [MyDashboardActionNames.RESET_LIST, MyDashboardActions.resetList],
    [MyDashboardActionNames.ON_FILTERS, MyDashboardActions.onFilters],
    [MyDashboardActionNames.ADD_FILTER, MyDashboardActions.addFilter],
]);

export {
    MyDashboardActions,
    MyDashboardActionsMap,
    MyDashboardActionNames,
    MyDashboardPrefix
};