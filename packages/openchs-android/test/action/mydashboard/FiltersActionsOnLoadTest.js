import {assert} from "chai";

jest.mock("../../../src/framework/bean/Service", () => () => (target) => target);

import {FiltersActions} from "../../../src/action/mydashboard/FiltersActions";
import IndividualSearchCriteria from "../../../src/service/query/IndividualSearchCriteria";
import AddressLevelService from "../../../src/service/AddressLevelService";
import AddressLevelsState from "../../../src/action/common/AddressLevelsState";

const BLOCK = {uuid: "b-1", name: "Block 1", level: 2, type: "Block", parentUuid: "d-1"};
const V1 = {uuid: "v-1", name: "Village 1", level: 1, type: "Village", parentUuid: "b-1"};
const V2 = {uuid: "v-2", name: "Village 2", level: 1, type: "Village", parentUuid: "b-1"};

const descendants = {"b-1": [V1, V2]};
const addressLevelService = {
    getAllDescendants: (addresses) => addresses.flatMap(a => descendants[a.uuid] || []),
};
const context = {
    get: (type) => type === AddressLevelService ? addressLevelService : {findEncounterTypesForSubjectType: () => []},
};

const load = (addressLevelState, locationSearchCriteria = IndividualSearchCriteria.empty()) =>
    FiltersActions.onLoad(FiltersActions.getInitialState(), {
        filters: new Map(),
        locationSearchCriteria,
        addressLevelState,
        filterDate: {value: new Date()},
        selectedSubjectType: {uuid: "st-1"},
    }, context);

const matchedUUIDs = (state) => state.locationSearchCriteria.clone().getAllAddressLevelUUIDs().sort();

describe("FiltersActions.onLoad location criteria", () => {
    it("matches the villages under a selected block, as choosing the block in Filter does", () => {
        const state = load(new AddressLevelsState([{...BLOCK, isSelected: true}, V1, V2]));

        assert.deepEqual(matchedUUIDs(state), ["b-1", "v-1", "v-2"]);
    });

    it("matches every village at a level set to Any", () => {
        const state = load(new AddressLevelsState([BLOCK, V1, V2], new Set(["Village"])));

        assert.deepEqual(matchedUUIDs(state), ["v-1", "v-2"]);
    });

    it("replaces criteria that were narrowed to the selected addresses alone", () => {
        const narrowed = IndividualSearchCriteria.empty();
        narrowed.toggleLowestAddresses([BLOCK]);

        const state = load(new AddressLevelsState([{...BLOCK, isSelected: true}, V1, V2]), narrowed);

        assert.deepEqual(matchedUUIDs(state), ["b-1", "v-1", "v-2"]);
    });

    it("matches no location, and Apply can still clone the criteria, when nothing is selected", () => {
        const state = load(new AddressLevelsState());

        assert.doesNotThrow(() => state.locationSearchCriteria.clone());
        assert.deepEqual(matchedUUIDs(state), []);
    });
});
