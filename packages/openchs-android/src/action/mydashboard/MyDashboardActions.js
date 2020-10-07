import EntityService from "../../service/EntityService";
import {DashboardCache, Privilege, SubjectType} from "avni-models";
import _ from 'lodash';
import IndividualService from "../../service/IndividualService";
import IndividualSearchCriteria from "../../service/query/IndividualSearchCriteria";
import AddressLevelState from '../common/AddressLevelsState';
import CustomFilterService from "../../service/CustomFilterService";
import PrivilegeService from "../../service/PrivilegeService";
import UserInfoService from "../../service/UserInfoService";
import DashboardCacheService from "../../service/DashboardCacheService";
import AddressLevelService from "../../service/AddressLevelService";

class MyDashboardActions {
    static getInitialState(context) {
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
            generalEncounterTypes: [],
            selectedGeneralEncounterTypes: [],
            itemsToDisplay: [],
            fetchFromDB: !context.get(UserInfoService).getUserSettings().disableAutoRefresh,
            selectedCustomFilters: [],
            selectedGenders: [],
            loading: false
        };
    }

    static applyFilters(filters) {
        return (individuals) => [...filters.values()]
            .reduce((acc, f) => f.compositeFn(acc), individuals);
    }

    static orQuery(array) {
        return array.length > 0 ? '( ' + array.join(' OR ') + ' )' : ''
    }

    static commonIndividuals = (otherFilteredIndividuals, customFilteredIndividualsUUIDs) => ((_.isEmpty(customFilteredIndividualsUUIDs) || _.isEmpty(otherFilteredIndividuals)) ?
        otherFilteredIndividuals : otherFilteredIndividuals.filter(iInfo => _.includes(customFilteredIndividualsUUIDs, iInfo.individual.uuid)));

    static onLoad(state, action, context) {
        const individualService = context.get(IndividualService);
        const viewSubjectCriteria = `privilege.name = '${Privilege.privilegeName.viewSubject}' AND privilege.entityType = '${Privilege.privilegeEntityType.subject}'`;
        const privilegeService = context.get(PrivilegeService);
        const allowedSubjectTypeUUIDs = privilegeService.allowedEntityTypeUUIDListForCriteria(viewSubjectCriteria, 'subjectTypeUuid');
        const allowedSubjectTypes = _.filter(context.get(EntityService).findAllByCriteria('voided = false', SubjectType.schema.name), subjectType => !privilegeService.hasEverSyncedGroupPrivileges() || privilegeService.hasAllPrivileges() || _.includes(allowedSubjectTypeUUIDs, subjectType.uuid));
        const subjectType = state.selectedSubjectType || allowedSubjectTypes[0] || SubjectType.create("");
        const fetchFromDB = action.fetchFromDB || state.fetchFromDB;

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
        ] = state.returnEmpty ? [[], [], [], [], [], []] : (fetchFromDB ? [
                MyDashboardActions.commonIndividuals(individualService.allScheduledVisitsIn(state.date.value, encountersFilters, generalEncountersFilters), state.individualUUIDs),
                MyDashboardActions.commonIndividuals(individualService.allOverdueVisitsIn(state.date.value, encountersFilters, generalEncountersFilters), state.individualUUIDs),
                MyDashboardActions.commonIndividuals(individualService.recentlyCompletedVisitsIn(state.date.value, encountersFilters, generalEncountersFilters), state.individualUUIDs),
                MyDashboardActions.commonIndividuals(individualService.recentlyRegistered(state.date.value, individualFilters), state.individualUUIDs),
                MyDashboardActions.commonIndividuals(individualService.recentlyEnrolled(state.date.value, enrolmentFilters), state.individualUUIDs),
                MyDashboardActions.commonIndividuals(individualService.allIn(state.date.value, individualFilters), state.individualUUIDs)
            ]
            : [state.scheduled, state.overdue, state.recentlyCompletedVisits, state.recentlyCompletedRegistration, state.recentlyCompletedEnrolment, state.total]);

        const queryResult = {
            scheduled: allIndividualsWithScheduledVisits,
            overdue: allIndividualsWithOverDueVisits,
            recentlyCompletedVisits: allIndividualsWithRecentlyCompletedVisits,
            recentlyCompletedRegistration: allIndividualsWithRecentRegistrations,
            recentlyCompletedEnrolment: allIndividualsWithRecentEnrolments,
            total: allIndividuals,
        };

        if (state.returnEmpty || fetchFromDB) {
            const updatedOn = new Date();
            const cardJSON = _.mapValues(queryResult, v => v && v.length || 0);
            const filterJSON = DashboardCache.getFilterJSONFromState(state);
            filterJSON.selectedAddressesInfo = _.flatten([...new Map(state.addressLevelState.levels).values()])
                .map(({uuid, name, level, type, isSelected}) => ({
                    uuid,
                    name,
                    level,
                    type,
                    isSelected
                }));
            const dashboardCache = DashboardCache.create(updatedOn, JSON.stringify(cardJSON), JSON.stringify(filterJSON));
            context.get(DashboardCacheService).saveOrUpdate(dashboardCache);
        }

        const {counts, lastUpdatedOn, cachedFilters} = MyDashboardActions.getResultCounts(queryResult, context);
        const cachedDate = cachedFilters.date;

        return {
            ...state,
            ...queryResult,
            visits: counts,
            selectedSubjectType: subjectType,
            individualFilters,
            encountersFilters,
            enrolmentFilters,
            itemsToDisplay: [],
            fetchFromDB: false,
            loading: false,
            lastUpdatedOn: lastUpdatedOn,
            ...cachedFilters,
            date: {value: cachedDate && new Date(cachedDate.value) || state.date.value}
        };
    }

    static getResultCounts(queryResult, context) {
        const readCachedData = context.get(UserInfoService).getUserSettings().disableAutoRefresh;
        const cachedData = context.get(DashboardCacheService).cachedData();
        const counts = readCachedData ? MyDashboardActions.getRowCount(cachedData.getCardJSON()) : MyDashboardActions.getRowCount(_.mapValues(queryResult, v => v && v.length || 0));
        const lastUpdatedOn = cachedData.updatedAt;
        const filterJSON = cachedData.getFilterJSON();
        const cachedFilters = readCachedData ? filterJSON : {};
        const addressLevelService = context.get(AddressLevelService);
        const withLocationMappings = _.map(cachedFilters.selectedAddressesInfo,
            ({uuid, name, level, type, isSelected}) =>
                ({
                    uuid, name, level, type, isSelected,
                    locationMappings: addressLevelService.findByUUID(uuid).locationMappings
                }));
        const addressLevelState = new AddressLevelState(withLocationMappings);
        cachedFilters.addressLevelState = addressLevelState;
        cachedFilters.selectedLocations = addressLevelState.selectedAddresses;
        return {counts, lastUpdatedOn, cachedFilters: readCachedData ? cachedFilters : {}}
    }

    static onListLoad(state, action, context) {
        const {listType} = action;
        const individualService = context.get(IndividualService);
        const getResult = (db, local) => state.fetchFromDB || !local ? db : local;

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
        const allIndividuals = state.fetchFromDB || !state[listType] ? methodMap.get(listType)(state.date.value, filters, state.generalEncountersFilters) : methodMap.get(listType);
        const commonIndividuals = MyDashboardActions.commonIndividuals(allIndividuals, state.individualUUIDs);
        const totalToDisplay = _.orderBy(commonIndividuals, ({visitInfo}) => visitInfo.sortingBy, 'desc').slice(0, 50);
        return {
            ...state,
            individuals: {
                data: commonIndividuals,
            },
            itemsToDisplay: totalToDisplay,
            [listType]: commonIndividuals,
            loading: false,
        };
    }

    static onDate(state, action, context) {
        return MyDashboardActions.onLoad({...state, date: {value: action.value}, fetchFromDB: true}, action, context);
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
        const generalVisitQuery = (path) => _.map(action.selectedGeneralEncounterTypes, (encounter) => `${path} = \'${encounter.uuid}\'`);
        const generalVisitQueryFromIndividual = _.map(action.selectedGeneralEncounterTypes, (encounter) => `$encounter.encounterType.uuid = \'${encounter.uuid}\' AND $encounter.voided = false`);
        const programQuery = (path) => shouldApplyValidEnrolmentQuery ? _.map(action.selectedPrograms, (program) => `${path} = \'${program.uuid}\'`) : '';
        const validEnrolmentQuery = (path) => shouldApplyValidEnrolmentQuery ? `${path}.voided = false and ${path}.programExitDateTime = null` : '';
        const genderQuery = (path) => _.map(action.selectedGenders, (gender) => `${path} = "${gender.name}"`);

        const customFilterService = context.get(CustomFilterService);
        var individualUUIDs = [];
        const selectedCustomFilterBySubjectType = _.mapValues(action.selectedCustomFilters, selectedFilters => {
            const s = selectedFilters.filter(filter => filter.subjectTypeUUID === action.selectedSubjectType.uuid);
            return s.length === 0 ? [] : s
        });
        const dashboardFiltersEmpty = customFilterService.isDashboardFiltersEmpty(selectedCustomFilterBySubjectType);
        if (!dashboardFiltersEmpty) {
            individualUUIDs = customFilterService.applyCustomFilters(selectedCustomFilterBySubjectType, 'myDashboardFilters');
        }

        const restIndividualFilters = [
            MyDashboardActions.orQuery(programQuery('$enrolment.program.uuid')),
            MyDashboardActions.orQuery(visitQuery('$enrolment.encounters.encounterType.uuid')),
            validEnrolmentQuery('$enrolment')
        ].filter(Boolean).join(" AND ");

        const buildEnrolmentSubQueryForIndividual = () => _.isEmpty(restIndividualFilters) ? '' :
            'SUBQUERY(enrolments, $enrolment, ' + restIndividualFilters + ' ).@count > 0';

        const encounterQuery = () => _.isEmpty(MyDashboardActions.orQuery(generalVisitQueryFromIndividual)) ? '' :
            'SUBQUERY(encounters, $encounter, ' + MyDashboardActions.orQuery(generalVisitQueryFromIndividual) + ' ).@count > 0';

        const individualFilters = [
            subjectTypeQuery('subjectType.uuid'),
            MyDashboardActions.orQuery(genderQuery('gender.name')),
            MyDashboardActions.orQuery(locationQuery('lowestAddressLevel.uuid')),
            encounterQuery(),
            buildEnrolmentSubQueryForIndividual()
        ].filter(Boolean).join(" AND ");

        const encountersFilters = [
            subjectTypeQuery('programEnrolment.individual.subjectType.uuid'),
            MyDashboardActions.orQuery(genderQuery('programEnrolment.individual.gender.name')),
            MyDashboardActions.orQuery(locationQuery('programEnrolment.individual.lowestAddressLevel.uuid')),
            MyDashboardActions.orQuery(programQuery('programEnrolment.program.uuid')),
            MyDashboardActions.orQuery(visitQuery('encounterType.uuid')),
            validEnrolmentQuery("programEnrolment")
        ].filter(Boolean).join(" AND ");

        const generalEncountersFilters = [
            subjectTypeQuery('individual.subjectType.uuid'),
            MyDashboardActions.orQuery(genderQuery('individual.gender.name')),
            MyDashboardActions.orQuery(locationQuery('individual.lowestAddressLevel.uuid')),
            MyDashboardActions.orQuery(generalVisitQuery('encounterType.uuid'))
        ].filter(Boolean).join(" AND ");

        const enrolmentFilters = [
            subjectTypeQuery('individual.subjectType.uuid'),
            MyDashboardActions.orQuery(genderQuery('individual.gender.name')),
            MyDashboardActions.orQuery(locationQuery('individual.lowestAddressLevel.uuid')),
            MyDashboardActions.orQuery(programQuery('program.uuid')),
            MyDashboardActions.orQuery(visitQuery('encounters.encounterType.uuid')),
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
            generalEncounterTypes: action.generalEncounterTypes,
            selectedGeneralEncounterTypes: action.selectedGeneralEncounterTypes,
            individualFilters,
            encountersFilters,
            enrolmentFilters,
            generalEncountersFilters,
            selectedSubjectType: action.selectedSubjectType,
            fetchFromDB: true,
            selectedCustomFilters: selectedCustomFilterBySubjectType,
            returnEmpty: !dashboardFiltersEmpty && _.isEmpty(individualUUIDs),
            individualUUIDs,
            selectedGenders: action.selectedGenders
        };

        return _.isNil(action.listType) ? MyDashboardActions.onLoad(newState, {}, context) : MyDashboardActions.onListLoad(newState, action, context);
    }

    static loadIndicator(state, action) {
        return {...state, loading: action.status};
    }

    static getRowCount({scheduled, overdue, recentlyCompletedVisits, recentlyCompletedRegistration, recentlyCompletedEnrolment, total}) {
        const row1 = {
            visits: {
                scheduled: {count: scheduled, abnormal: false},
                overdue: {count: overdue, abnormal: false},
            }
        };
        const row2 = {
            visits: {
                recentlyCompletedRegistration: {
                    count: recentlyCompletedRegistration,
                    abnormal: false,
                    label: 'RecentRegistration'
                },
                recentlyCompletedEnrolment: {
                    count: recentlyCompletedEnrolment,
                    abnormal: false,
                    label: 'RecentEnrollment'
                },
                recentlyCompletedVisits: {
                    count: recentlyCompletedVisits,
                    abnormal: false,
                    label: 'RecentVisits'
                },
            }
        };
        const row3 = {
            visits: {
                total: {count: total, abnormal: false}
            }
        };
        return [row1, row2, row3];
    }
}

const MyDashboardPrefix = "MyD";

const MyDashboardActionNames = {
    ON_LOAD: `${MyDashboardPrefix}.ON_LOAD`,
    ON_LIST_LOAD: `${MyDashboardPrefix}.ON_LIST_LOAD`,
    RESET_LIST: `${MyDashboardPrefix}.RESET_LIST`,
    ON_DATE: `${MyDashboardPrefix}.ON_DATE`,
    APPLY_FILTERS: `${MyDashboardPrefix}.APPLY_FILTERS`,
    LOAD_INDICATOR: `${MyDashboardPrefix}.LOAD_INDICATOR`,
};

const MyDashboardActionsMap = new Map([
    [MyDashboardActionNames.ON_DATE, MyDashboardActions.onDate],
    [MyDashboardActionNames.ON_LOAD, MyDashboardActions.onLoad],
    [MyDashboardActionNames.ON_LIST_LOAD, MyDashboardActions.onListLoad],
    [MyDashboardActionNames.RESET_LIST, MyDashboardActions.resetList],
    [MyDashboardActionNames.APPLY_FILTERS, MyDashboardActions.assignFilters],
    [MyDashboardActionNames.LOAD_INDICATOR, MyDashboardActions.loadIndicator],
]);

export {
    MyDashboardActions,
    MyDashboardActionsMap,
    MyDashboardActionNames,
    MyDashboardPrefix
};
