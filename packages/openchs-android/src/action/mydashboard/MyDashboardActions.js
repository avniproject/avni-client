import EntityService from "../../service/EntityService";
import {AddressLevel, SubjectType} from "openchs-models";
import _ from 'lodash';
import IndividualService from "../../service/IndividualService";
import FilterService from "../../service/FilterService";
import IndividualSearchCriteria from "../../service/query/IndividualSearchCriteria";
import AddressLevelState from '../common/AddressLevelsState';

class MyDashboardActions {
    static getInitialState() {
        return {
            visits: {},
            individuals: {data: []},
            date: {value: new Date()},
            showFilters: false,
            filters: new Map(),
            locationSearchCriteria: IndividualSearchCriteria.empty(),
            encounterLocationFilters: [],
            individualLocationFilters: [],
            selectedLocations: [],
            addressLevelState: new AddressLevelState(),
        };
    }

    static clone(state) {
        return {};
    }

    static applyFilters(filters) {
        return (individuals) => [...filters.values()]
            .reduce((acc, f) => f.compositeFn(acc), individuals);
    }

    static queryAdditions(filters) {
        return [...filters.values()].map(f => f.orQuery()).filter((q) => !_.isEmpty(q)).join(" AND ");
    }

    static onLoad(state, action, context) {
        const entityService = context.get(EntityService);
        const individualService = context.get(IndividualService);
        const subjectType = entityService.getAll(SubjectType.schema.name)[0];
        const results = {};
        let filters = MyDashboardActions.cloneFilters(state.filters);
        if (state.filters.size === 0) {
            const filterService = context.get(FilterService);
            filters = filterService.getAllFilters().reduce((acc, f) => acc.set(f.label, f), new Map());
        }
        //get all the lowest level address UUIDs for the selected locations
        const addressUUIDs = state.locationSearchCriteria.getAllAddressLevelUUIDs();
        let individualLocationFilters = [];
        let encounterLocationFilters = [];
        addressUUIDs.forEach((addressLevel) => {
            individualLocationFilters.push(`lowestAddressLevel.uuid = "${addressLevel}"`);
            encounterLocationFilters.push(`programEnrolment.individual.lowestAddressLevel.uuid = "${addressLevel}"`)
        });
        const individualFilters = individualLocationFilters.length > 0 ? individualLocationFilters.join(" OR ") : undefined;
        const encountersFilters = encounterLocationFilters.length > 0 ? encounterLocationFilters.join(" OR ") : undefined;
        const queryAdditions = MyDashboardActions.queryAdditions(filters);
        const [allIndividualsWithScheduledVisits,
            allIndividualsWithOverDueVisits,
            allIndividualsWithCompletedVisits,
            allIndividuals] =
            [individualService.allScheduledVisitsIn(state.date.value, queryAdditions, encountersFilters),
                individualService.allOverdueVisitsIn(state.date.value, queryAdditions, encountersFilters),
                individualService.allCompletedVisitsIn(state.date.value, queryAdditions, encountersFilters),
                individualService.allIn(state.date.value, queryAdditions, individualFilters)
            ].map(MyDashboardActions.applyFilters(filters));
        let existingResultForAddress = {
            visits: {
                scheduled: {count: 0, abnormal: false},
                overdue: {count: 0, abnormal: false},
                completedVisits: {count: 0, abnormal: false},
                total: {count: 0, abnormal: false}
            }
        };
        existingResultForAddress.visits.scheduled.count = allIndividualsWithScheduledVisits.length;
        existingResultForAddress.visits.overdue.count = allIndividualsWithOverDueVisits.length;
        existingResultForAddress.visits.completedVisits.count = allIndividualsWithCompletedVisits.length;
        existingResultForAddress.visits.total.count = allIndividuals.length;
        results['33490f6b-21b7-462f-a356-daea14f4893e'] = existingResultForAddress;
        return {
            ...state, visits: results, filters: filters, subjectType: subjectType,
            individualLocationFilters: individualFilters, encounterLocationFilters: encountersFilters
        };
    }

    static onListLoad(state, action, context) {
        const individualService = context.get(IndividualService);
        const methodMap = new Map([
            ["scheduled", individualService.allScheduledVisitsIn],
            ["overdue", individualService.allOverdueVisitsIn],
            ["completedVisits", individualService.allCompletedVisitsIn],
            ["total", individualService.allIn]
        ]);
        const filters = action.listType === 'total' ? state.individualLocationFilters : state.encounterLocationFilters;
        const queryAdditions = MyDashboardActions.queryAdditions(state.filters);
        const allIndividuals = methodMap.get(action.listType)(state.date.value, queryAdditions, filters)
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

    static assignFilters(state, action, context) {
        const newFilters = MyDashboardActions.cloneFilters(action.filters);
        const newState = {
            ...state,
            filters: newFilters,
            locationSearchCriteria: action.locationSearchCriteria.clone(),
            selectedLocations: action.selectedLocations,
            addressLevelState: action.addressLevelState.clone(),
            date: {value: action.filterDate},
        };
        return MyDashboardActions.onLoad(newState, {}, context);
    }

}

const MyDashboardPrefix = "MyD";

const MyDashboardActionNames = {
    ON_LOAD: `${MyDashboardPrefix}.ON_LOAD`,
    ON_LIST_LOAD: `${MyDashboardPrefix}.ON_LIST_LOAD`,
    RESET_LIST: `${MyDashboardPrefix}.RESET_LIST`,
    ON_DATE: `${MyDashboardPrefix}.ON_DATE`,
    ON_FILTERS: `${MyDashboardPrefix}.ON_FILTERS`,
    ADD_FILTER: `${MyDashboardPrefix}.ADD_FILTER`,
    APPLY_FILTERS: `${MyDashboardPrefix}.APPLY_FILTERS`,
};

const MyDashboardActionsMap = new Map([
    [MyDashboardActionNames.ON_DATE, MyDashboardActions.onDate],
    [MyDashboardActionNames.ON_LOAD, MyDashboardActions.onLoad],
    [MyDashboardActionNames.ON_LIST_LOAD, MyDashboardActions.onListLoad],
    [MyDashboardActionNames.RESET_LIST, MyDashboardActions.resetList],
    [MyDashboardActionNames.ON_FILTERS, MyDashboardActions.onFilters],
    [MyDashboardActionNames.ADD_FILTER, MyDashboardActions.addFilter],
    [MyDashboardActionNames.APPLY_FILTERS, MyDashboardActions.assignFilters],
]);

export {
    MyDashboardActions,
    MyDashboardActionsMap,
    MyDashboardActionNames,
    MyDashboardPrefix
};
