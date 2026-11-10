// A phone for tests that need the real dashboard save and read back. Only storage and entity lookups are fake: an in-memory
// store of the dashboards and their caches, the filter rows and the subject types, programs and concept they point at, and
// the entities a saved uuid reads back as, and the programs each subject type enrols into (a FormMappingService stand-in). DashboardFilterService, CustomDashboardCacheService and CustomDashboardService are the real ones.
// Not named *Test.js, so jest does not run it as a test.

import {Concept, Dashboard, DashboardFilter, Program, SubjectType} from "openchs-models";

jest.mock("../../../src/framework/bean/Service", () => () => (target) => target);

import CustomDashboardService from "../../../src/service/customDashboard/CustomDashboardService";
import CustomDashboardCacheService from "../../../src/service/CustomDashboardCacheService";
import DashboardFilterService from "../../../src/service/reports/DashboardFilterService";
import EntityService from "../../../src/service/EntityService";
import FormMappingService from "../../../src/service/FormMappingService";

// A row as DashboardFilterService.getFilters returns it.
export function filterRow(uuid, name, filterSettings) {
    return {uuid, name, filterConfig: JSON.stringify(filterSettings)};
}

export const fakeEntities = (uuids) => uuids.map((uuid) => ({uuid, name: uuid}));

// `dashboards` maps a dashboard uuid to its filter rows.
// `subjectTypes` and `programs`, when given, are the only ones the phone has, each {uuid, name, voided}; a uuid outside them
// looks up as nothing and reads back as nothing. When left out, any subject type uuid looks up as a "Household" and any saved uuid reads back as an entity.
// `enrolledPrograms` maps a subject type uuid to the uuids of the programs it enrols into, read at call time so a test can change its entries
// after setUpPhone (replacing the object is not seen). When left out, every subject type enrols into every program the phone has.
export function setUpPhone({dashboards: rowsByDashboard, subjectTypes, programs, enrolledPrograms}) {
    const rows = {};
    Object.values(rowsByDashboard).forEach((dashboardRows) => dashboardRows.forEach((row) => (rows[row.uuid] = row)));
    const filterOf = (uuid) => {
        const filter = new DashboardFilter();
        filter.uuid = uuid;
        filter.name = rows[uuid].name;
        filter.filterConfig = rows[uuid].filterConfig;
        filter.voided = false;
        return filter;
    };
    const dashboards = {};
    Object.entries(rowsByDashboard).forEach(([uuid, dashboardRows]) => {
        const dashboard = new Dashboard();
        dashboard.uuid = uuid;
        dashboard.filters = dashboardRows.map((row) => filterOf(row.uuid));
        dashboards[uuid] = dashboard;
    });
    const caches = {};
    const declared = (list, uuid) => (list.find((x) => x.uuid === uuid) || null);

    const dashboardFilterService = new DashboardFilterService(null, null);
    dashboardFilterService.getFilters = (dashboardUUID) => rowsByDashboard[dashboardUUID];
    dashboardFilterService.findByUUID = (uuid, schemaName) => {
        if (schemaName === SubjectType.schema.name) return subjectTypes ? declared(subjectTypes, uuid) : {uuid, name: "Household"};
        if (schemaName === Program.schema.name && programs) return declared(programs, uuid);
        if (schemaName === Concept.schema.name) return {uuid, name: uuid, datatype: Concept.dataType.Text};
        return filterOf(uuid);
    };
    // As FormMappingService.findProgramsForSubjectTypes: the live programs any of the subject types enrols into (FormMappingService.js:41-47, :94).
    const formMappingService = {
        findProgramsForSubjectTypes: (subjectTypes) => {
            const candidates = (programs || []).filter((program) => !program.voided);
            if (!enrolledPrograms) return candidates;
            const enrolled = subjectTypes.flatMap((subjectType) => enrolledPrograms[subjectType.uuid] || []);
            return candidates.filter((program) => enrolled.includes(program.uuid));
        },
    };
    dashboardFilterService.getService = (klass) => (klass === FormMappingService ? formMappingService : undefined);
    const entityService = {
        findAllByUUID: (uuids, schemaName) => {
            if (schemaName === SubjectType.schema.name && subjectTypes) return uuids.map((uuid) => declared(subjectTypes, uuid)).filter(Boolean);
            if (schemaName === Program.schema.name && programs) return uuids.map((uuid) => declared(programs, uuid)).filter(Boolean);
            return fakeEntities(uuids);
        },
    };

    // The store keeps its own copy of each cache, as a database does, so a later write is the only way a saved value changes.
    const cacheService = new CustomDashboardCacheService(null, null);
    cacheService.findByFiltered = (_field, dashboardUUID) => caches[dashboardUUID];
    cacheService.findByUUID = (uuid) => dashboards[uuid];
    cacheService.save = (cache) => {
        caches[cache.dashboard.uuid] = cache.clone();
        return caches[cache.dashboard.uuid];
    };
    cacheService.saveOrUpdate = (cache) => {
        caches[cache.dashboard.uuid] = cache.clone();
        return caches[cache.dashboard.uuid];
    };
    // The real delete needs a transaction manager.
    cacheService.delete = (cache) => {
        delete caches[cache.dashboard.uuid];
    };
    const cacheServices = new Map([[DashboardFilterService, dashboardFilterService], [EntityService, entityService]]);
    cacheService.getService = (klass) => cacheServices.get(klass);

    const service = new CustomDashboardService(null, null);
    const services = new Map([[DashboardFilterService, dashboardFilterService], [CustomDashboardCacheService, cacheService]]);
    service.getService = (klass) => services.get(klass);

    // A sync that changes a filter's settings changes the row and the filter on the Dashboard the cache keeps, in place.
    const changeFilterSettings = (filterUUID, filterSettings) => {
        const filterConfig = JSON.stringify(filterSettings);
        rows[filterUUID].filterConfig = filterConfig;
        Object.values(dashboards).forEach((dashboard) => dashboard.filters.filter((f) => f.uuid === filterUUID).forEach((f) => (f.filterConfig = filterConfig)));
    };

    return {
        service,
        dashboardFilterService,
        cacheService,
        changeFilterSettings,
        savedValues: (dashboardUUID) => JSON.parse(caches[dashboardUUID].selectedValuesJSON),
        cache: (dashboardUUID) => caches[dashboardUUID],
    };
}

// Two dashboards, "source" with filter s1 and "target" with filter t1, both with the same settings.
export function setUpWithRealSave(filterSettings) {
    return setUpPhone({dashboards: {
        source: [filterRow("s1", "Filter", filterSettings)],
        target: [filterRow("t1", "Filter", filterSettings)],
    }});
}
