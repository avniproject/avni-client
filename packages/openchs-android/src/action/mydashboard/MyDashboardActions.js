import EntityService from "../../service/EntityService";
import {SubjectType} from "openchs-models";
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
            individualFilters: [],
            encountersFilters: [],
            generalEncountersFilters: [],
            enrolmentFilters: [],
            selectedLocations: [],
            addressLevelState: new AddressLevelState(),
            programs: [],
            selectedPrograms: [],
            encounterTypes: [],
            selectedEncounterTypes: [],
            itemsToDisplay: [],
            fetchFromDB: true,
            scheduled: 0,
            overdue: 0,
            recentlyCompletedVisits: 0,
            recentlyCompletedRegistration: 0,
            recentlyCompletedEnrolment: 0,
            total: 0,
        };
    }

    static applyFilters(filters) {
        return (individuals) => [...filters.values()]
            .reduce((acc, f) => f.compositeFn(acc), individuals);
    }

    static orQuery(array) {
        return array.length > 0 ? '( ' + array.join(' OR ') + ' )' : ''
    }

    static onLoad(state, action, context) {
        const entityService = context.get(EntityService);
        const individualService = context.get(IndividualService);
        const subjectType = state.selectedSubjectType || entityService.getAll(SubjectType.schema.name)[0] || SubjectType.create("");

        let filters = MyDashboardActions.cloneFilters(state.filters);
        if (state.filters.size === 0) {
            const filterService = context.get(FilterService);
            filters = filterService.getAllFilters().reduce((acc, f) => acc.set(f.label, f), new Map());
        }

        let individualFilters, encountersFilters, enrolmentFilters, generalEncountersFilters;
        if (_.isEmpty(state.individualFilters)) {
            const subjectTypeQuery = (path) => [`${path} = "${subjectType.uuid}"`];
            individualFilters = subjectTypeQuery('subjectType.uuid');
            encountersFilters = subjectTypeQuery('programEnrolment.individual.subjectType.uuid');
            enrolmentFilters = subjectTypeQuery('individual.subjectType.uuid');
            generalEncountersFilters = subjectTypeQuery('individual.subjectType.uuid');
        } else {
            individualFilters = state.individualFilters;
            encountersFilters = state.encountersFilters;
            enrolmentFilters = state.enrolmentFilters;
            generalEncountersFilters = state.generalEncountersFilters;
        }

        const [
            allIndividualsWithScheduledVisits,
            allIndividualsWithOverDueVisits,
            allIndividualsWithRecentlyCompletedVisits,
            allIndividualsWithRecentRegistrations,
            allIndividualsWithRecentEnrolments,
            allIndividuals
        ] = state.fetchFromDB ? [
                individualService.allScheduledVisitsIn(state.date.value, encountersFilters, generalEncountersFilters),
                individualService.allOverdueVisitsIn(state.date.value, encountersFilters, generalEncountersFilters),
                individualService.recentlyCompletedVisitsIn(state.date.value, encountersFilters, generalEncountersFilters),
                individualService.recentlyRegistered(state.date.value, individualFilters),
                individualService.recentlyEnrolled(state.date.value, enrolmentFilters),
                individualService.allIn(state.date.value, individualFilters)
            ].map(MyDashboardActions.applyFilters(filters))
            : [state.scheduled, state.overdue, state.recentlyCompletedVisits, state.recentlyCompletedRegistration, state.recentlyCompletedEnrolment, state.total];

        const queryResult = {
            scheduled: allIndividualsWithScheduledVisits,
            overdue: allIndividualsWithOverDueVisits,
            recentlyCompletedVisits: allIndividualsWithRecentlyCompletedVisits,
            recentlyCompletedRegistration: allIndividualsWithRecentRegistrations,
            recentlyCompletedEnrolment: allIndividualsWithRecentEnrolments,
            total: allIndividuals,
        };


        let row1 = {
            visits: {
                scheduled: {count: 0, abnormal: false},
                overdue: {count: 0, abnormal: false},
            }
        };
        let row2 = {
            visits: {
                recentlyCompletedRegistration: {count: 0, abnormal: false, label: 'RecentRegistration'},
                recentlyCompletedEnrolment: {count: 0, abnormal: false, label: 'RecentEnrollment'},
                recentlyCompletedVisits: {count: 0, abnormal: false, label: 'RecentVisits'},
            }
        };
        let row3 = {
            visits: {
                total: {count: 0, abnormal: false}
            }
        };
        row1.visits.scheduled.count = allIndividualsWithScheduledVisits.length;
        row1.visits.overdue.count = allIndividualsWithOverDueVisits.length;
        row2.visits.recentlyCompletedVisits.count = allIndividualsWithRecentlyCompletedVisits.length;
        row2.visits.recentlyCompletedRegistration.count = allIndividualsWithRecentRegistrations.length;
        row2.visits.recentlyCompletedEnrolment.count = allIndividualsWithRecentEnrolments.length;
        row3.visits.total.count = allIndividuals.length;

        const results = [row1, row2, row3];

        return {
            ...state,
            ...queryResult,
            visits: results,
            filters: filters,
            selectedSubjectType: subjectType,
            individualFilters,
            encountersFilters,
            enrolmentFilters,
            itemsToDisplay: [],
            fetchFromDB: false,
        };
    }

    static onListLoad(state, action, context) {
        const {listType} = action;
        const individualService = context.get(IndividualService);
        const getResult = (db, local) => state.fetchFromDB ? db : local;

        const methodMap = new Map([
            ["scheduled", getResult(individualService.allScheduledVisitsIn, state.scheduled)],
            ["overdue", getResult(individualService.allOverdueVisitsIn, state.overdue)],
            ["recentlyCompletedVisits", getResult(individualService.recentlyCompletedVisitsIn, state.recentlyCompletedVisits)],
            ["recentlyCompletedRegistration", getResult(individualService.recentlyRegistered, state.recentlyCompletedRegistration)],
            ["recentlyCompletedEnrolment", getResult(individualService.recentlyEnrolled, state.recentlyCompletedEnrolment)],
            ["total", getResult(individualService.allIn, state.total)]
        ]);
        const filters = listType === 'recentlyCompletedEnrolment' ? state.enrolmentFilters :
            (listType === 'total' || listType === 'recentlyCompletedRegistration') ? state.individualFilters : state.encountersFilters;
        const allIndividuals = state.fetchFromDB ? methodMap.get(listType)(state.date.value, filters) : methodMap.get(listType);
        const totalToDisplay = _.orderBy(allIndividuals, ({visitInfo}) => visitInfo.sortingBy, 'desc').slice(0, 50);
        return {
            ...state,
            individuals: {
                data: allIndividuals,
            },
            itemsToDisplay: totalToDisplay,
        };
    }

    static onDate(state, action, context) {
        return MyDashboardActions.onLoad({...state, date: {value: action.value}}, action, context);
    }


    static resetList(state) {
        return {
            ...state,
            itemsToDisplay: [],
        }
    }

    static cloneFilters(filters) {
        return [...filters.entries()].reduce((acc, [l, f]) => acc.set(l, f.clone()), new Map());
    }

    static addFilter(state, action, context) {
        const newFilters = MyDashboardActions.cloneFilters(state.filters.set(action.filter.label, action.filter));
        return {...state, filters: newFilters};
    }

    static assignFilters(state, action, context) {
        const shouldApplyValidEnrolmentQuery = (() => {
            if (action.programs.length > 1) return !_.isEmpty(action.selectedPrograms);
            if (action.programs.length === 1) return !_.isEmpty(action.selectedEncounterTypes);
            return false;
        })();

        const newFilters = MyDashboardActions.cloneFilters(action.filters);

        //get all the lowest level address UUIDs for the selected locations
        const addressUUIDs = action.locationSearchCriteria.clone().getAllAddressLevelUUIDs();
        const locationQuery = (path) => _.map(addressUUIDs, (address) => `${path} = \'${address}\'`);
        const subjectTypeQuery = (path) => `${path} = "${action.selectedSubjectType.uuid}"`;
        const visitQuery = (path) => shouldApplyValidEnrolmentQuery ? action.selectedEncounterTypes.map((encounter) => `${path} = \'${encounter.uuid}\'`) : '';
        const programQuery = (path) => shouldApplyValidEnrolmentQuery ? _.map(action.selectedPrograms, (program) => `${path} = \'${program.uuid}\'`) : '';
        const validEnrolmentQuery = (path) => shouldApplyValidEnrolmentQuery ? `${path}.voided = false and ${path}.programExitDateTime = null` : '';

        const individualFilters = [
            subjectTypeQuery('subjectType.uuid'),
            MyDashboardActions.orQuery(locationQuery('lowestAddressLevel.uuid')),
            MyDashboardActions.orQuery(programQuery('enrolments.program.uuid')),
            MyDashboardActions.orQuery(visitQuery('enrolments.encounters.encounterType.uuid')),
            validEnrolmentQuery("enrolments")
        ].filter(Boolean).join(" AND ");

        const encountersFilters = [
            subjectTypeQuery('programEnrolment.individual.subjectType.uuid'),
            MyDashboardActions.orQuery(locationQuery('programEnrolment.individual.lowestAddressLevel.uuid')),
            MyDashboardActions.orQuery(programQuery('programEnrolment.program.uuid')),
            MyDashboardActions.orQuery(visitQuery('encounterType.uuid')),
            validEnrolmentQuery("programEnrolment")
        ].filter(Boolean).join(" AND ");

        const generalEncountersFilters = [
            subjectTypeQuery('individual.subjectType.uuid'),
            MyDashboardActions.orQuery(locationQuery('individual.lowestAddressLevel.uuid')),
            MyDashboardActions.orQuery(visitQuery('encounterType.uuid'))
        ].filter(Boolean).join(" AND ");

        const enrolmentFilters = [
            subjectTypeQuery('individual.subjectType.uuid'),
            MyDashboardActions.orQuery(locationQuery('individual.lowestAddressLevel.uuid')),
            MyDashboardActions.orQuery(programQuery('program.uuid')),
            'voided = false and programExitDateTime = null'
        ].filter(Boolean).join(" AND ");


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
            individualFilters,
            encountersFilters,
            enrolmentFilters,
            generalEncountersFilters,
            selectedSubjectType: action.selectedSubjectType,
            fetchFromDB: true,
        };

        return _.isNil(action.listType) ? MyDashboardActions.onLoad(newState, {}, context) : MyDashboardActions.onListLoad(newState, action, context);
    }
}

const MyDashboardPrefix = "MyD";

const MyDashboardActionNames = {
    ON_LOAD: `${MyDashboardPrefix}.ON_LOAD`,
    ON_LIST_LOAD: `${MyDashboardPrefix}.ON_LIST_LOAD`,
    RESET_LIST: `${MyDashboardPrefix}.RESET_LIST`,
    ON_DATE: `${MyDashboardPrefix}.ON_DATE`,
    ADD_FILTER: `${MyDashboardPrefix}.ADD_FILTER`,
    APPLY_FILTERS: `${MyDashboardPrefix}.APPLY_FILTERS`,
};

const MyDashboardActionsMap = new Map([
    [MyDashboardActionNames.ON_DATE, MyDashboardActions.onDate],
    [MyDashboardActionNames.ON_LOAD, MyDashboardActions.onLoad],
    [MyDashboardActionNames.ON_LIST_LOAD, MyDashboardActions.onListLoad],
    [MyDashboardActionNames.RESET_LIST, MyDashboardActions.resetList],
    [MyDashboardActionNames.ADD_FILTER, MyDashboardActions.addFilter],
    [MyDashboardActionNames.APPLY_FILTERS, MyDashboardActions.assignFilters],
]);

export {
    MyDashboardActions,
    MyDashboardActionsMap,
    MyDashboardActionNames,
    MyDashboardPrefix
};
