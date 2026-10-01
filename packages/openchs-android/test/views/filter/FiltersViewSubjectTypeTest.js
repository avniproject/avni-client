import React from "react";
import TestRenderer, {act} from "react-test-renderer";

jest.mock("../../../src/utility/Analytics", () => ({
    __esModule: true,
    screenRenderStart: () => 0,
    logScreenEvent: () => {},
}));
jest.mock("../../../src/reducer", () => ({__esModule: true, default: {reducerKeys: {filterAction: "filterAction"}}}));
jest.mock("../../../src/views/common/CHSContainer", () => ({__esModule: true, default: ({children}) => require("react").createElement(require("react-native").View, null, children)}));
jest.mock("../../../src/views/common/CHSContent", () => ({__esModule: true, default: ({children}) => require("react").createElement(require("react-native").View, null, children)}));
jest.mock("native-base", () => ({__esModule: true, ScrollView: ({children}) => require("react").createElement(require("react-native").View, null, children)}));
jest.mock("../../../src/views/common/AppHeader", () => ({__esModule: true, default: () => null}));
jest.mock("../../../src/views/primitives/DatePicker", () => ({__esModule: true, default: () => null}));
jest.mock("../../../src/views/filter/SingleSelectFilter", () => ({__esModule: true, default: () => null}));
jest.mock("../../../src/views/filter/MultiSelectFilter", () => ({__esModule: true, default: () => null}));
jest.mock("../../../src/views/common/ProgramFilter", () => ({__esModule: true, default: () => null}));
jest.mock("../../../src/views/filter/CustomFilters", () => ({__esModule: true, default: () => null}));
jest.mock("../../../src/views/filter/GenderFilter", () => ({__esModule: true, default: () => null}));
jest.mock("../../../src/views/CustomActivityIndicator", () => ({__esModule: true, default: () => null}));
jest.mock("../../../src/model/SingleSelectFilterModel", () => ({__esModule: true, default: {forSubjectTypes: () => ({})}}));

// Like the real picker, the stub copies addressLevelState from props only when it mounts.
let mockAddressLevelMounts;
jest.mock("../../../src/views/common/AddressLevels", () => {
    const React = require("react");
    return {
        __esModule: true,
        default: class extends React.Component {
            UNSAFE_componentWillMount() {
                mockAddressLevelMounts.push(this.props.addressLevelState);
            }

            render() {
                return null;
            }
        },
    };
});

import FiltersView from "../../../src/views/filter/FiltersView";
import ServiceContext from "../../../src/framework/context/ServiceContext";

const INDIVIDUAL = {uuid: "st-1", name: "Individual"};
const PSG_MEETING = {uuid: "st-2", name: "PSG meeting"};
const ticked = {selectedAddresses: [{uuid: "block-kotma"}]};
const cleared = {selectedAddresses: []};

const services = {
    getI18n: () => ({t: (k) => k}),
    findAllByCriteria: () => [INDIVIDUAL, PSG_MEETING],
    findProgramsForSubjectType: () => [],
    filterTypePresent: () => true,
    getTopLevelFilters: () => [],
    getBottomLevelFilters: () => [],
    allowedEntityTypeUUIDListForCriteria: () => [],
    hasAllPrivileges: () => true,
    getUserSettings: () => ({locale: "en"}),
    getAllowedViewPrograms: () => [],
};

const filterState = (selectedSubjectType, addressLevelState) => ({
    filters: new Map(), filterDate: {value: new Date("2026-10-01")},
    subjectTypes: [INDIVIDUAL, PSG_MEETING], selectedSubjectType, addressLevelState,
    programs: [], selectedPrograms: [], encounterTypes: [], selectedEncounterTypes: [],
    generalEncounterTypes: [], selectedGeneralEncounterTypes: [], selectedCustomFilters: [], selectedGenders: [],
    loading: false,
});

describe("FiltersView subject type change", () => {
    beforeEach(() => {
        mockAddressLevelMounts = [];
    });

    it("rebuilds the address picker with the cleared locations when the subject type changes", () => {
        const store = {state: {filterAction: filterState(INDIVIDUAL, ticked)}, listeners: []};
        const context = {
            getService: () => services,
            getStore: () => ({
                getState: () => store.state,
                subscribe: (listener) => (store.listeners.push(listener), () => {}),
                dispatch: () => {},
            }),
            getDB: () => ({}),
        };
        act(() => {
            TestRenderer.create(
                <ServiceContext.Provider value={context}>
                    <FiltersView selectedSubjectType={INDIVIDUAL} filterDate={{value: new Date("2026-10-01")}}/>
                </ServiceContext.Provider>);
        });
        expect(mockAddressLevelMounts).toEqual([ticked]);

        store.state = {filterAction: filterState(PSG_MEETING, cleared)};
        act(() => store.listeners.forEach((listener) => listener()));

        expect(mockAddressLevelMounts).toEqual([ticked, cleared]);
    });
});
