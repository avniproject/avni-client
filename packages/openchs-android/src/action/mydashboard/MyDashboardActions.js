import EntityService from "../../service/EntityService";
import {AddressLevel, SubjectType} from "openchs-models";
import _ from 'lodash';
import IndividualService from "../../service/IndividualService";
import FilterService from "../../service/FilterService";
import IndividualSearchCriteria from "../../service/query/IndividualSearchCriteria";
import AddressLevelState from '../common/AddressLevelsState';
import FormMappingService from "../../service/FormMappingService";

class MyDashboardActions {
    static getInitialState() {
        return {
            visits: {},
            individuals: {data: []},
            date: {value: new Date()},
            showFilters: false,
            filters: new Map(),
            locationSearchCriteria: IndividualSearchCriteria.empty(),
            individualFilters: [],
            encountersFilters: [],
            enrolmentFilters: [],
            selectedLocations: [],
            addressLevelState: new AddressLevelState(),
            programs: [],
            selectedPrograms: [],
            encounterTypes: [],
            selectedEncounterTypes: [],
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

    static orQuery(array) {
        return array.length > 0 ? '( ' + array.join(' OR ') + ' )' : ''
    }

    static onLoad(state, action, context) {
        const entityService = context.get(EntityService);
        const individualService = context.get(IndividualService);
        const formMappingService = context.get(FormMappingService);
        const subjectType = entityService.getAll(SubjectType.schema.name)[0];
        let filters = MyDashboardActions.cloneFilters(state.filters);
        if (state.filters.size === 0) {
            const filterService = context.get(FilterService);
            filters = filterService.getAllFilters().reduce((acc, f) => acc.set(f.label, f), new Map());
        }
        //get all the lowest level address UUIDs for the selected locations
        const addressUUIDs = state.locationSearchCriteria.getAllAddressLevelUUIDs();
        let individualLocationFilters = [];
        let encounterLocationFilters = [];
        let enrolmentLocationFilters = [];
        addressUUIDs.forEach((addressLevel) => {
            individualLocationFilters.push(`lowestAddressLevel.uuid = \'${addressLevel}\'`);
            encounterLocationFilters.push(`programEnrolment.individual.lowestAddressLevel.uuid = \'${addressLevel}\'`);
            enrolmentLocationFilters.push(`individual.lowestAddressLevel.uuid = \'${addressLevel}\'`);
        });
        const visitQuery = _.isEmpty(state.selectedEncounterTypes) ?
            _.flatten(state.selectedPrograms.map((program) => formMappingService.findEncounterTypesForProgram(program)))
                .map((encounter) => `encounterType.uuid = \'${encounter.uuid}\'`) :
            state.selectedEncounterTypes.map((encounter) => `encounterType.uuid = \'${encounter.uuid}\'`);

        const selectedPrograms = _.map(state.selectedPrograms, (prog) => `program.uuid = \'${prog.uuid}\'`);
        const individualFilters = MyDashboardActions.orQuery(individualLocationFilters);
        const encountersFilters = [MyDashboardActions.orQuery(encounterLocationFilters), MyDashboardActions.orQuery(visitQuery)].filter(Boolean).join(" AND ");
        const enrolmentFilters = [MyDashboardActions.orQuery(enrolmentLocationFilters), MyDashboardActions.orQuery(selectedPrograms)].filter(Boolean).join(" AND ");

        const [allIndividualsWithScheduledVisits,
            allIndividualsWithOverDueVisits,
            allIndividualsWithRecentlyCompletedVisits,
            allIndividualsWithRecentRegistrations,
            allIndividualsWithRecentEnrolments,
            allIndividuals] =
            [individualService.allScheduledVisitsIn(state.date.value, encountersFilters),
                individualService.allOverdueVisitsIn(state.date.value, encountersFilters),
                individualService.recentlyCompletedVisitsIn(state.date.value, encountersFilters),
                individualService.recentlyRegistered(state.date.value, individualFilters),
                individualService.recentlyEnrolled(state.date.value, enrolmentFilters),
                individualService.allIn(state.date.value, individualFilters)
            ].map(MyDashboardActions.applyFilters(filters));
        let row1 = {
            visits: {
                scheduled: {count: 0, abnormal: false, visitInfo: {}},
                overdue: {count: 0, abnormal: false, visitInfo: {}},
            }
        };
        let row2 = {
            visits: {
                recentlyCompletedRegistration: {count: 0, abnormal: false, label: 'Recent Registration'},
                recentlyCompletedEnrolment: {count: 0, abnormal: false, label: 'Recent Enrollment'},
                recentlyCompletedVisits: {count: 0, abnormal: false, label: 'Recent Visits'},
            }
        };
        let row3 = {
            visits: {
                total: {count: 0, abnormal: false}
            }
        };
        row1.visits.scheduled.count = allIndividualsWithScheduledVisits.length;
        row1.visits.scheduled.visitInfo = _.map(allIndividualsWithScheduledVisits, ({visitInfo}) => visitInfo);
        row1.visits.overdue.count = allIndividualsWithOverDueVisits.length;
        row1.visits.overdue.visitInfo = _.map(allIndividualsWithOverDueVisits, ({visitInfo}) => visitInfo);
        row2.visits.recentlyCompletedVisits.count = allIndividualsWithRecentlyCompletedVisits.length;
        row2.visits.recentlyCompletedRegistration.count = allIndividualsWithRecentRegistrations.length;
        row2.visits.recentlyCompletedEnrolment.count = allIndividualsWithRecentEnrolments.length;
        row3.visits.total.count = allIndividuals.length;

        const results = [row1, row2, row3];

        return {
            ...state,
            visits: results,
            filters: filters,
            subjectType: subjectType,
            individualFilters,
            encountersFilters,
            enrolmentFilters
        };
    }

    static onListLoad(state, action, context) {
        const individualService = context.get(IndividualService);
        const methodMap = new Map([
            ["scheduled", individualService.allScheduledVisitsIn],
            ["overdue", individualService.allOverdueVisitsIn],
            ["recentlyCompletedVisits", individualService.recentlyCompletedVisitsIn],
            ["recentlyCompletedRegistration", individualService.recentlyRegistered],
            ["recentlyCompletedEnrolment", individualService.recentlyEnrolled],
            ["total", individualService.allIn]
        ]);
        const filters = action.listType === 'recentlyCompletedEnrolment' ? state.enrolmentFilters :
            (action.listType === 'total' || action.listType === 'recentlyCompletedRegistration') ? state.individualFilters : state.encountersFilters;
        const allIndividuals = methodMap.get(action.listType)(state.date.value, filters)
            .map((individual) => {
                const ind = _.isNil(individual.visitInfo) ? individual : individual.individual;
                return individualService.findByUUID(ind.uuid)
            });
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
            programs: action.programs,
            selectedPrograms: action.selectedPrograms,
            encounterTypes: action.encounterTypes,
            selectedEncounterTypes: action.selectedEncounterTypes,
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
