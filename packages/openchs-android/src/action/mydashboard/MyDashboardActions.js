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
import {firebaseEvents, logEvent} from "../../utility/Analytics";

function getApplicableEncounterTypes(state) {
    return _.isEmpty(state.selectedGeneralEncounterTypes) ? state.selectedEncounterTypes : state.selectedGeneralEncounterTypes;
}

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

    static commonIndividuals = (otherFilteredIndividuals, customFilteredIndividualsUUIDs, isTotal = false) => {
        const getIndividualUUID  = (indInfo) => isTotal ? indInfo.uuid : indInfo.individual.uuid;
        return ((_.isEmpty(customFilteredIndividualsUUIDs) || _.isEmpty(otherFilteredIndividuals)) ?
            otherFilteredIndividuals : otherFilteredIndividuals.filter(iInfo => _.includes(customFilteredIndividualsUUIDs, getIndividualUUID(iInfo))));
    };

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

        const queryProgramEncounter = MyDashboardActions.shouldQueryProgramEncounter(state);
        const queryGeneralEncounter = MyDashboardActions.shouldQueryGeneralEncounter(state);

        const [
            allIndividualsWithScheduledVisits,
            allIndividualsWithOverDueVisits,
            allIndividualsWithRecentlyCompletedVisits,
            allIndividualsWithRecentRegistrations,
            allIndividualsWithRecentEnrolments,
            allIndividuals
        ] = state.returnEmpty ? [[], [], [], [], [], []] : (fetchFromDB ? [
                MyDashboardActions.commonIndividuals(individualService.allScheduledVisitsIn(state.date.value, encountersFilters, generalEncountersFilters, queryProgramEncounter, queryGeneralEncounter), state.individualUUIDs),
                MyDashboardActions.commonIndividuals(individualService.allOverdueVisitsIn(state.date.value, encountersFilters, generalEncountersFilters, queryProgramEncounter, queryGeneralEncounter), state.individualUUIDs),
                MyDashboardActions.commonIndividuals(individualService.recentlyCompletedVisitsIn(state.date.value, encountersFilters, generalEncountersFilters, queryProgramEncounter, queryGeneralEncounter), state.individualUUIDs),
                MyDashboardActions.commonIndividuals(individualService.recentlyRegistered(state.date.value, individualFilters, state.selectedPrograms, getApplicableEncounterTypes(state)), state.individualUUIDs),
                MyDashboardActions.commonIndividuals(individualService.recentlyEnrolled(state.date.value, enrolmentFilters), state.individualUUIDs),
                MyDashboardActions.commonIndividuals(individualService.allInWithFilters(state.date.value, individualFilters, state.selectedPrograms, getApplicableEncounterTypes(state)), state.individualUUIDs, true)
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
                .map(({uuid, name, level, type, isSelected, parentUuid}) => ({
                    uuid,
                    name,
                    level,
                    type,
                    parentUuid,
                    isSelected
                }));
            const dashboardCache = DashboardCache.create(updatedOn, JSON.stringify(cardJSON), JSON.stringify(filterJSON));
            context.get(DashboardCacheService).saveOrUpdate(dashboardCache);
        }

        const {counts, lastUpdatedOn, cachedFilters} = MyDashboardActions.getResultCounts(queryResult, subjectType, context);
        const cachedDate = cachedFilters.date;

        return {
            ...state,
            ...queryResult,
            visits: counts,
            selectedSubjectType: subjectType,
            individualFilters,
            encountersFilters,
            generalEncountersFilters,
            enrolmentFilters,
            itemsToDisplay: [],
            fetchFromDB: false,
            loading: false,
            lastUpdatedOn: lastUpdatedOn,
            ...cachedFilters,
            date: {value: cachedDate && new Date(cachedDate.value) || state.date.value}
        };
    }

    static getResultCounts(queryResult, subjectType, context) {
        const readCachedData = context.get(UserInfoService).getUserSettings().disableAutoRefresh;
        const cachedData = context.get(DashboardCacheService).cachedData();
        const privilegeService = context.get(PrivilegeService);
        const displayProgramTab = privilegeService.displayProgramTab(subjectType);
        const counts = readCachedData ? MyDashboardActions.getRowCount(cachedData.getCardJSON(), displayProgramTab) : MyDashboardActions.getRowCount(_.mapValues(queryResult, v => v && v.length || 0), displayProgramTab);
        const lastUpdatedOn = cachedData.updatedAt;
        const filterJSON = cachedData.getFilterJSON();
        const cachedFilters = readCachedData ? filterJSON : {};
        const addressLevelState = new AddressLevelState(cachedFilters.selectedAddressesInfo);
        cachedFilters.addressLevelState = addressLevelState;
        cachedFilters.selectedLocations = addressLevelState.selectedAddresses;
        return {counts, lastUpdatedOn, cachedFilters: readCachedData ? cachedFilters : {}}
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
            ["total", individualService.allIn]
        ]);
        const filters = listType === 'recentlyCompletedEnrolment' ? state.enrolmentFilters :
            (listType === 'total' || listType === 'recentlyCompletedRegistration') ? state.individualFilters : state.encountersFilters;
        const queryProgramEncounter = MyDashboardActions.shouldQueryProgramEncounter(state);
        const queryGeneralEncounter = MyDashboardActions.shouldQueryGeneralEncounter(state);
        let allIndividuals;
        if (listType === "recentlyCompletedRegistration" || listType === "total")
            allIndividuals = methodMap.get(listType)(state.date.value, filters, state.selectedPrograms, getApplicableEncounterTypes(state));
        else
            allIndividuals = methodMap.get(listType)(state.date.value, filters, state.generalEncountersFilters, queryProgramEncounter, queryGeneralEncounter);

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
        const selectedFilterTypes = MyDashboardActions.getSelectedFilterTypes(newState);
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
            .pickBy((v,k) => !_.isEmpty(v))
            .keys()
            .join(', ')
            .value();
    }

    static loadIndicator(state, action) {
        return {...state, loading: action.status};
    }

    static getRowCount({scheduled, overdue, recentlyCompletedVisits, recentlyCompletedRegistration, recentlyCompletedEnrolment, total}, displayProgramTab) {
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
        if (!displayProgramTab) {
            delete row2.visits.recentlyCompletedEnrolment;
        }
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
