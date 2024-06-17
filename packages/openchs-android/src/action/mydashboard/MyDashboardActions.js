import _ from 'lodash';
import IndividualService from "../../service/IndividualService";
import IndividualSearchCriteria from "../../service/query/IndividualSearchCriteria";
import AddressLevelState from '../common/AddressLevelsState';
import CustomFilterService from "../../service/CustomFilterService";
import PrivilegeService from "../../service/PrivilegeService";
import UserInfoService from "../../service/UserInfoService";
import DashboardCacheService from "../../service/DashboardCacheService";
import {firebaseEvents, logEvent} from "../../utility/Analytics";
import RealmQueryService from "../../service/query/RealmQueryService";
import SubjectTypeService from "../../service/SubjectTypeService";
import {DashboardCacheFilter} from "openchs-models";
import General from "../../utility/General";

function getApplicableEncounterTypes(holder) {
    return _.isEmpty(holder.selectedGeneralEncounterTypes) ? holder.selectedEncounterTypes : holder.selectedGeneralEncounterTypes;
}

function updateCacheWithPostSyncValues(context) {
    const dashboardCacheService = context.get(DashboardCacheService);
    const subjectTypeService = context.get(SubjectTypeService);
    const subjectTypes = subjectTypeService.getAllowedSubjectTypes();
    const oneSyncCompleted = subjectTypes.length !== 0;
    let toUpdateValues = {
        selectedLocations: [],
        selectedPrograms: [],
        selectedEncounterTypes: [],
        selectedGeneralEncounterTypes: [],
        selectedCustomFilters: [],
        selectedGenders: [],
        filterDate: new Date()
    };
    const dashboardCache = dashboardCacheService.getCache();
    const dashboardCacheFilter = dashboardCache.getFilter();
    if (oneSyncCompleted) {
        const subjectTypeQuery = (path) => [`${path} = "${subjectTypes[0].uuid}"`];
        toUpdateValues = {
            individualFilters: subjectTypeQuery('subjectType.uuid'),
            encountersFilters: subjectTypeQuery('programEnrolment.individual.subjectType.uuid'),
            enrolmentFilters: subjectTypeQuery('individual.subjectType.uuid'),
            generalEncountersFilters: subjectTypeQuery('individual.subjectType.uuid'),
            dueChecklistFilter: subjectTypeQuery('individual.subjectType.uuid'),
            selectedSubjectTypeUUID: subjectTypes[0].uuid,
            ...toUpdateValues
        };
    }
    DashboardCacheFilter.overwriteFields(toUpdateValues, dashboardCacheFilter, false);
    dashboardCacheService.updateFilter(dashboardCacheFilter);
}

// Update from state
function updateCachedFilter(from, context) {
    const dashboardCacheService = context.get(DashboardCacheService);
    const dashboardCache = dashboardCacheService.getCache();
    const dashboardCacheFilter = dashboardCache.getFilter();
    DashboardCacheFilter.overwriteFields(from, dashboardCacheFilter, true);
    dashboardCacheService.updateFilter(dashboardCacheFilter);
}

function updateCachedFilterFields(from, context) {
    const dashboardCacheService = context.get(DashboardCacheService);
    const dashboardCache = dashboardCacheService.getCache();
    const dashboardCacheFilter = dashboardCache.getFilter();
    Object.keys(from).forEach((field) => {
        dashboardCacheFilter[field] = from[field];
    });
    dashboardCacheService.updateFilter(dashboardCacheFilter);
}

function getResultCounts(queryResult, subjectType, context) {
    const readCachedData = context.get(UserInfoService).getUserSettings().disableAutoRefresh;
    const dashboardCacheService = context.get(DashboardCacheService);
    const dashboardCache = dashboardCacheService.getCache();
    const privilegeService = context.get(PrivilegeService);
    const displayProgramTab = privilegeService.displayProgramTab(subjectType);
    return readCachedData ? MyDashboardActions.getRowCount(dashboardCache.getCard(), displayProgramTab) : MyDashboardActions.getRowCount(_.mapValues(queryResult, v => v && v.length || 0), displayProgramTab);
}

/*
    Dashboard Cache stores the information related to filters and card counts. The view looks at only state and doesn't know about the cache.
    These scenarios have to be supported:
    1. initial load when cache and state is empty
    2. user changes filter
    3. re-launch of app when cache is present
    4. reload (called after sync, or update of data) which means new data that cache may not have updated counts for

    Cache should contain only user input and some queried output. It should store master data etc.

    1. onLoad and cache
        - initialise cache with defaults for user input
        - update cache with some query output fields
    2. onLoad, state and cache
        -- any information present in cache if required in state can be used from there instead of reinitialising
    3. filling of filter
        -- create new state
        -- update cache with new state
 */
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
            dueChecklistFilter: [],
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

    static commonIndividuals = (otherFilteredIndividuals, customFilteredIndividualsUUIDs, isTotal = false) => {
        const getIndividualUUID = (indInfo) => isTotal ? indInfo.uuid : indInfo.individual.uuid;
        return ((_.isEmpty(customFilteredIndividualsUUIDs) || _.isEmpty(otherFilteredIndividuals)) ?
            otherFilteredIndividuals : otherFilteredIndividuals.filter(iInfo => _.includes(customFilteredIndividualsUUIDs, getIndividualUUID(iInfo))));
    };

    static onLoad(state, action, context) {
        updateCacheWithPostSyncValues(context);

        const individualService = context.get(IndividualService);
        const dashboardCacheService = context.get(DashboardCacheService);
        const dashboardCache = dashboardCacheService.getCache();
        const dashboardCacheFilter = dashboardCache.getFilter();
        const fetchFromDB = action.fetchFromDB || state.fetchFromDB;

        const queryProgramEncounter = MyDashboardActions.shouldQueryProgramEncounter(state);
        const queryGeneralEncounter = MyDashboardActions.shouldQueryGeneralEncounter(state);
        const dueChecklistWithChecklistItem = individualService.dueChecklistForDefaultDashboard(dashboardCacheFilter.filterDate, dashboardCacheFilter.dueChecklistFilter);

        const [
            allIndividualsWithScheduledVisits,
            allIndividualsWithOverDueVisits,
            allIndividualsWithRecentlyCompletedVisits,
            allIndividualsWithRecentRegistrations,
            allIndividualsWithRecentEnrolments,
            allIndividuals,
            dueChecklist
        ] = state.returnEmpty ? [[], [], [], [], [], [], [], []] : (fetchFromDB ? [
                MyDashboardActions.commonIndividuals(individualService.allScheduledVisitsIn(dashboardCacheFilter.filterDate, [], RealmQueryService.orQuery(dashboardCacheFilter.encountersFilters), RealmQueryService.orQuery(dashboardCacheFilter.generalEncountersFilters), queryProgramEncounter, queryGeneralEncounter), state.individualUUIDs),

                MyDashboardActions.commonIndividuals(individualService.allOverdueVisitsIn(dashboardCacheFilter.filterDate, [], RealmQueryService.orQuery(dashboardCacheFilter.encountersFilters), RealmQueryService.orQuery(dashboardCacheFilter.generalEncountersFilters), queryProgramEncounter, queryGeneralEncounter), state.individualUUIDs),

                MyDashboardActions.commonIndividuals(individualService.recentlyCompletedVisitsIn(dashboardCacheFilter.filterDate, [], dashboardCacheFilter.encountersFilters, dashboardCacheFilter.generalEncountersFilters, queryProgramEncounter, queryGeneralEncounter), state.individualUUIDs),

                MyDashboardActions.commonIndividuals(individualService.recentlyRegistered(dashboardCacheFilter.filterDate, [], dashboardCacheFilter.individualFilters, dashboardCacheFilter.selectedPrograms, getApplicableEncounterTypes(dashboardCacheFilter)), state.individualUUIDs),

                MyDashboardActions.commonIndividuals(individualService.recentlyEnrolled(dashboardCacheFilter.filterDate, [], dashboardCacheFilter.enrolmentFilters), state.individualUUIDs),
                MyDashboardActions.commonIndividuals(individualService.allInWithFilters(dashboardCacheFilter.filterDate, [], RealmQueryService.orQuery(dashboardCacheFilter.individualFilters), dashboardCacheFilter.selectedPrograms, getApplicableEncounterTypes(dashboardCacheFilter)), state.individualUUIDs, true),

                MyDashboardActions.commonIndividuals(dueChecklistWithChecklistItem.individual, state.individualUUIDs)
            ]
            : [state.scheduled, state.overdue, state.recentlyCompletedVisits, state.recentlyCompletedRegistration, state.recentlyCompletedEnrolment, state.total, state.dueChecklist]);

        dueChecklistWithChecklistItem.individual = dueChecklist;

        const queryResult = {
            scheduled: allIndividualsWithScheduledVisits,
            overdue: allIndividualsWithOverDueVisits,
            recentlyCompletedVisits: allIndividualsWithRecentlyCompletedVisits,
            recentlyCompletedRegistration: allIndividualsWithRecentRegistrations,
            recentlyCompletedEnrolment: allIndividualsWithRecentEnrolments,
            total: allIndividuals,
            dueChecklist: dueChecklist,
            dueChecklistWithChecklistItem: dueChecklistWithChecklistItem
        };

        if (state.returnEmpty || fetchFromDB) {
            const card = _.mapValues(queryResult, v => v && v.length || 0);
            dashboardCacheService.updateCard(card);
        }

        const subjectType = context.get(SubjectTypeService).findByUUID(dashboardCacheFilter.selectedSubjectTypeUUID);
        const counts = getResultCounts(queryResult, subjectType, context);

        return {
            ...state,
            ...queryResult,
            visits: counts,
            selectedSubjectType: subjectType,
            individualFilters: dashboardCacheFilter.individualFilters,
            encountersFilters: dashboardCacheFilter.encountersFilters,
            generalEncountersFilters: dashboardCacheFilter.generalEncountersFilters,
            enrolmentFilters: dashboardCacheFilter.enrolmentFilters,
            dueChecklistFilter: dashboardCacheFilter.dueChecklistFilter,
            itemsToDisplay: [],
            fetchFromDB: false,
            loading: false,
            addressLevelState: new AddressLevelState(dashboardCacheFilter.selectedAddressesInfo),
            selectedAddressesInfo: dashboardCacheFilter.selectedAddressesInfo,
            selectedLocations: dashboardCacheFilter.selectedLocations,
            selectedCustomFilters: dashboardCacheFilter.selectedCustomFilters,
            selectedGenders: dashboardCacheFilter.selectedGenders,
            selectedPrograms: dashboardCacheFilter.selectedPrograms,
            selectedEncounterTypes: dashboardCacheFilter.selectedEncounterTypes,
            selectedGeneralEncounterTypes: dashboardCacheFilter.selectedGeneralEncounterTypes,
            date: {value: dashboardCacheFilter.filterDate}
        };
    }

    static onListLoad(state, action, context) {
        const {listType} = action;
        const individualService = context.get(IndividualService);

        const methodMap = new Map([
            ["scheduled", individualService.allScheduledVisitsIn],
            ["overdue", individualService.allOverdueVisitsIn],
            ["recentlyCompletedVisits", individualService.recentlyCompletedVisitsIn],
            ["recentlyCompletedRegistration", individualService.recentlyRegistered],
            ["recentlyCompletedEnrolment", individualService.recentlyEnrolled],
            ["total", individualService.allIn],
            ["dueChecklist", individualService.dueChecklistForDefaultDashboard]
        ]);
        const filters = listType === 'recentlyCompletedEnrolment' ? state.enrolmentFilters :
            (listType === 'total' || listType === 'recentlyCompletedRegistration' || listType === "dueChecklist") ? state.individualFilters : state.encountersFilters;
        const queryProgramEncounter = MyDashboardActions.shouldQueryProgramEncounter(state);
        const queryGeneralEncounter = MyDashboardActions.shouldQueryGeneralEncounter(state);
        let allIndividuals;
        if (listType === "recentlyCompletedRegistration" || listType === "total")
            allIndividuals = methodMap.get(listType)(state.date.value, [], filters, state.selectedPrograms, getApplicableEncounterTypes(state));
        else if (listType === "dueChecklist") {
            allIndividuals = methodMap.get(listType)(state.date.value, [], state.dueChecklistFilter)
        } else
            allIndividuals = methodMap.get(listType)(state.date.value, [], filters, state.generalEncountersFilters, queryProgramEncounter, queryGeneralEncounter);

        const commonIndividuals = MyDashboardActions.commonIndividuals(allIndividuals, state.individualUUIDs, listType === 'total');
        const totalToDisplay = listType === 'total' ? commonIndividuals : _.orderBy(commonIndividuals, ({visitInfo}) => visitInfo.sortingBy, 'desc');
        return {
            ...state,
            individuals: {
                data: totalToDisplay,
            },
            itemsToDisplay: totalToDisplay,
            [listType]: totalToDisplay,
            loading: false,
        };
    }

    static onDate(state, action, context) {
        updateCachedFilterFields({filterDate: action.value}, context);
        return MyDashboardActions.onLoad({...state, fetchFromDB: true}, action, context);
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

    static shouldQueryGeneralEncounter(state) {
        return !_.isEmpty(state.selectedGeneralEncounterTypes) || MyDashboardActions.isNoProgramOrVisitFilterSelected(state);
    }

    static shouldQueryProgramEncounter(state) {
        return !_.isEmpty(state.selectedPrograms) || !_.isEmpty(state.selectedEncounterTypes) || MyDashboardActions.isNoProgramOrVisitFilterSelected(state);
    }

    static isNoProgramOrVisitFilterSelected({selectedGeneralEncounterTypes, selectedPrograms, selectedEncounterTypes}) {
        return _.isEmpty(selectedGeneralEncounterTypes) && _.isEmpty(selectedPrograms) && _.isEmpty(selectedEncounterTypes)
    }

    static assignFilters(state, action, context) {
        const startTime = Date.now();
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
        const visitQuery = (path) => shouldApplyValidEnrolmentQuery ? action.selectedEncounterTypes.map((encounterType) => `${path} = \'${encounterType.uuid}\'`) : '';
        const generalVisitQuery = (path) => _.map(action.selectedGeneralEncounterTypes, (encounterType) => `${path} = \'${encounterType.uuid}\'`);
        const generalVisitQueryFromIndividual = _.map(action.selectedGeneralEncounterTypes, (encounterType) => `$encounter.encounterType.uuid = \'${encounterType.uuid}\' AND $encounter.voided = false`);
        const programQuery = (path) => shouldApplyValidEnrolmentQuery ? _.map(action.selectedPrograms, (program) => `${path} = \'${program.uuid}\'`) : '';
        const validEnrolmentQuery = (path) => shouldApplyValidEnrolmentQuery ? `${path}.voided = false and ${path}.programExitDateTime = null` : '';
        const genderQuery = (path) => _.map(action.selectedGenders, (gender) => `${path} = "${gender.name}"`);

        const customFilterService = context.get(CustomFilterService);
        let individualUUIDs = [];
        const selectedCustomFilterBySubjectType = _.mapValues(action.selectedCustomFilters, selectedFilters => {
            const s = selectedFilters.filter(filter => filter.subjectTypeUUID === action.selectedSubjectType.uuid);
            return s.length === 0 ? [] : s
        });
        const dashboardFiltersEmpty = customFilterService.isDashboardFiltersEmpty(selectedCustomFilterBySubjectType);
        if (!dashboardFiltersEmpty) {
            individualUUIDs = customFilterService.applyCustomFilters(selectedCustomFilterBySubjectType, 'myDashboardFilters');
        }

        const restIndividualFilters = [
            RealmQueryService.orQuery(programQuery('$enrolment.program.uuid')),
            RealmQueryService.orQuery(visitQuery('$enrolment.encounters.encounterType.uuid')),
            validEnrolmentQuery('$enrolment')
        ].filter(Boolean).join(" AND ");

        const buildEnrolmentSubQueryForIndividual = () => _.isEmpty(restIndividualFilters) ? '' :
            'SUBQUERY(enrolments, $enrolment, ' + restIndividualFilters + ' ).@count > 0';

        const encounterQuery = () => _.isEmpty(RealmQueryService.orQuery(generalVisitQueryFromIndividual)) ? '' :
            'SUBQUERY(encounters, $encounter, ' + RealmQueryService.orQuery(generalVisitQueryFromIndividual) + ' ).@count > 0';

        const individualFilters = [
            subjectTypeQuery('subjectType.uuid'),
            RealmQueryService.orQuery(genderQuery('gender.name')),
            RealmQueryService.orQuery(locationQuery('lowestAddressLevel.uuid')),
            encounterQuery(),
            buildEnrolmentSubQueryForIndividual()
        ].filter(Boolean).join(" AND ");

        const encountersFilters = [
            subjectTypeQuery('programEnrolment.individual.subjectType.uuid'),
            RealmQueryService.orQuery(genderQuery('programEnrolment.individual.gender.name')),
            RealmQueryService.orQuery(locationQuery('programEnrolment.individual.lowestAddressLevel.uuid')),
            RealmQueryService.orQuery(programQuery('programEnrolment.program.uuid')),
            RealmQueryService.orQuery(visitQuery('encounterType.uuid')),
            validEnrolmentQuery("programEnrolment")
        ].filter(Boolean).join(" AND ");

        const generalEncountersFilters = [
            subjectTypeQuery('individual.subjectType.uuid'),
            RealmQueryService.orQuery(genderQuery('individual.gender.name')),
            RealmQueryService.orQuery(locationQuery('individual.lowestAddressLevel.uuid')),
            RealmQueryService.orQuery(generalVisitQuery('encounterType.uuid'))
        ].filter(Boolean).join(" AND ");

        const enrolmentFilters = [
            subjectTypeQuery('individual.subjectType.uuid'),
            RealmQueryService.orQuery(genderQuery('individual.gender.name')),
            RealmQueryService.orQuery(locationQuery('individual.lowestAddressLevel.uuid')),
            RealmQueryService.orQuery(programQuery('program.uuid')),
            RealmQueryService.orQuery(visitQuery('encounters.encounterType.uuid')),
            'voided = false and programExitDateTime = null'
        ].filter(Boolean).join(" AND ");

        const dueChecklistFilter = [
            subjectTypeQuery('individual.subjectType.uuid'),
            RealmQueryService.orQuery(genderQuery('individual.gender.name')),
            RealmQueryService.orQuery(locationQuery('individual.lowestAddressLevel.uuid')),
            RealmQueryService.orQuery(programQuery('program.uuid')),
            'programExitDateTime = null'
        ].filter(Boolean).join(" AND ");

        const transformedSelectedLocations = (action.selectedLocations && !_.isNil(action.selectedLocations)) ? action.selectedLocations.map(({
                                                                                                                                                  uuid,
                                                                                                                                                  name,
                                                                                                                                                  level,
                                                                                                                                                  type,
                                                                                                                                                  isSelected,
                                                                                                                                                  parentUuid
                                                                                                                                              }) => ({
            uuid,
            name,
            level,
            type,
            parentUuid,
            isSelected
        })) : [];
        const newState = {
            ...state,
            filters: newFilters,
            locationSearchCriteria: action.locationSearchCriteria.clone(),
            selectedLocations: transformedSelectedLocations,
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
            dueChecklistFilter,
            selectedSubjectType: action.selectedSubjectType,
            fetchFromDB: true,
            selectedCustomFilters: selectedCustomFilterBySubjectType,
            returnEmpty: !dashboardFiltersEmpty && _.isEmpty(individualUUIDs),
            individualUUIDs,
            selectedGenders: action.selectedGenders
        };
        const selectedFilterTypes = MyDashboardActions.getSelectedFilterTypes(newState);
        updateCachedFilter(newState, context);
        const selectedAddressesInfo = _.flatten([...new Map(newState.addressLevelState.levels).values()])
            .map(({uuid, name, level, type, isSelected, parentUuid}) => ({
                uuid,
                name,
                level,
                type,
                parentUuid,
                isSelected
            }));
        updateCachedFilterFields({selectedAddressesInfo, selectedSubjectTypeUUID: newState.selectedSubjectType.uuid, filterDate: action.filterDate}, context);
        const updatedState = _.isNil(action.listType) ? MyDashboardActions.onLoad(newState, {}, context) : MyDashboardActions.onListLoad(newState, action, context);
        logEvent(firebaseEvents.MY_DASHBOARD_FILTER, {time_taken: Date.now() - startTime, applied_filters: selectedFilterTypes});
        return updatedState;
    }

    static getSelectedFilterTypes({selectedLocations, selectedPrograms, selectedEncounterTypes, selectedGeneralEncounterTypes, selectedCustomFilters, selectedGenders}) {
        const selectedValueFilterTypeMap = {
            'Location': selectedLocations,
            'Program': selectedPrograms,
            'ProgramEncounter': selectedEncounterTypes,
            'GeneralEncounter': selectedGeneralEncounterTypes,
            'Gender': selectedGenders,
            ...selectedCustomFilters
        };
        return _.chain(selectedValueFilterTypeMap)
            .pickBy((v, k) => !_.isEmpty(v))
            .keys()
            .join(', ')
            .value();
    }

    static loadIndicator(state, action) {
        return {...state, loading: action.status};
    }

    static getRowCount({scheduled, overdue, recentlyCompletedVisits, recentlyCompletedRegistration, recentlyCompletedEnrolment, total, dueChecklist}, displayProgramTab) {
        const row1 = {
            visits: {
                scheduled: {
                    count: scheduled,
                    abnormal: false,
                    cardColor: "#388e3c",
                    textColor: "#FFF",
                    numberColor: '#FFF'
                },
                overdue: {
                    count: overdue,
                    abnormal: false,
                    cardColor: "#d32f2f",
                    textColor: "#FFF",
                    numberColor: '#FFF'
                },
            },
            sectionName: "visitDetailsSection"
        };
        const row2 = {
            visits: {
                recentlyCompletedRegistration: {
                    count: recentlyCompletedRegistration,
                    abnormal: false,
                    label: 'RecentRegistration',
                    cardColor: "#FFF",
                    textColor: "rgba(44,44,44,0.69)",
                    numberColor: '#2c2c2c'
                },
                recentlyCompletedEnrolment: {
                    count: recentlyCompletedEnrolment,
                    abnormal: false,
                    label: 'RecentEnrollment',
                    cardColor: "#FFF",
                    textColor: "rgba(44,44,44,0.69)",
                    numberColor: '#2c2c2c'
                },
                recentlyCompletedVisits: {
                    count: recentlyCompletedVisits,
                    abnormal: false,
                    label: 'RecentVisits',
                    cardColor: "#FFF",
                    textColor: "rgba(44,44,44,0.69)",
                    numberColor: '#2c2c2c'
                },
            },
            sectionName: "recentStatisticsSection"
        };
        const row3 = {
            visits: {
                total: {
                    count: total,
                    abnormal: false,
                    cardColor: "#FFF",
                    textColor: "rgba(44,44,44,0.69)",
                    numberColor: '#2c2c2c'
                }
            },
            sectionName: "registrationOverviewSection"
        };
        const row4 = {
            visits: {
                dueChecklist: {
                    count: dueChecklist,
                    abnormal: false,
                    cardColor: "#388e3c",
                    textColor: "#FFF",
                    numberColor: '#FFF'
                }
            },
            sectionName: "checklistOverviewSection"
        };
        if (!displayProgramTab) {
            delete row2.visits.recentlyCompletedEnrolment;
        }
        return [row1, row2, row3, row4];
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
