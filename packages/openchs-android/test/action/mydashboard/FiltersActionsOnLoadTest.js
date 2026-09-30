// FiltersActions.onLoad replaced the location criteria with whatever selectedLocations the caller passed.
// A caller that passed none left lowestAddressLevels undefined, and Apply then threw in
// IndividualSearchCriteria.clone() when Location was left untouched (avni-client#2157).

import {assert} from "chai";

jest.mock("../../../src/framework/bean/Service", () => () => (target) => target);

import {FiltersActions} from "../../../src/action/mydashboard/FiltersActions";
import IndividualSearchCriteria from "../../../src/service/query/IndividualSearchCriteria";

const context = {get: () => ({findEncounterTypesForSubjectType: () => []})};
const V1 = {uuid: "v-1", name: "Village 1", level: 1};
const V2 = {uuid: "v-2", name: "Village 2", level: 1};

const criteriaWith = (levels) => {
    const criteria = IndividualSearchCriteria.empty();
    criteria.toggleLowestAddresses(levels);
    return criteria;
};

const load = (overrides) => FiltersActions.onLoad(FiltersActions.getInitialState(), {
    filters: new Map(),
    locationSearchCriteria: IndividualSearchCriteria.empty(),
    filterDate: {value: new Date()},
    selectedSubjectType: {uuid: "st-1"},
    ...overrides,
}, context);

describe("FiltersActions.onLoad location criteria", () => {
    it("uses selectedLocations when given, so the dashboard's locations survive an app relaunch", () => {
        const state = load({selectedLocations: [V1]});
        assert.deepEqual(state.locationSearchCriteria.getAllAddressLevelUUIDs(), ["v-1"]);
    });

    it("keeps the incoming lowestAddressLevels when selectedLocations is missing", () => {
        const state = load({locationSearchCriteria: criteriaWith([V1, V2]), selectedLocations: undefined});
        assert.deepEqual(state.locationSearchCriteria.getAllAddressLevelUUIDs(), ["v-1", "v-2"]);
    });

    it("leaves criteria that Apply can clone when no locations are passed", () => {
        const state = load({selectedLocations: undefined});
        assert.doesNotThrow(() => state.locationSearchCriteria.clone());
        assert.deepEqual(state.locationSearchCriteria.clone().getAllAddressLevelUUIDs(), []);
    });
});
