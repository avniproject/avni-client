import {assert} from "chai";

jest.mock("../../../src/framework/bean/Service", () => () => (target) => target);

import {FiltersActions} from "../../../src/action/mydashboard/FiltersActions";
import IndividualSearchCriteria from "../../../src/service/query/IndividualSearchCriteria";
import AddressLevelsState from "../../../src/action/common/AddressLevelsState";

const PERSON = {uuid: "st-1", name: "Person"};
const HOUSEHOLD = {uuid: "st-2", name: "Household"};
const V1 = {uuid: "v-1", name: "Village 1", level: 1, type: "Village", isSelected: true};

const formMappingService = {
    findProgramsForSubjectType: () => [],
    findEncounterTypesForProgram: () => [],
    findEncounterTypesForSubjectType: () => [],
};
const context = {get: () => formMappingService};

describe("FiltersActions.addSubjectType", () => {
    it("drops the location filter along with the locations it clears from the screen", () => {
        const locationSearchCriteria = IndividualSearchCriteria.empty();
        locationSearchCriteria.toggleLowestAddresses([V1]);
        const state = {
            ...FiltersActions.getInitialState(),
            subjectTypes: [PERSON, HOUSEHOLD],
            selectedSubjectType: PERSON,
            selectedLocations: [V1],
            addressLevelState: new AddressLevelsState([V1]),
            locationSearchCriteria,
        };

        const newState = FiltersActions.addSubjectType(state, {subjectTypeName: "Household"}, context);

        assert.equal(newState.selectedSubjectType, HOUSEHOLD);
        assert.isEmpty(newState.addressLevelState.selectedAddresses);
        assert.deepEqual(newState.locationSearchCriteria.clone().getAllAddressLevelUUIDs(), []);
    });
});
