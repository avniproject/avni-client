// The applied-filters box on a dashboard: its clear control has to keep its size wherever the box sits.
import React from "react";
import {StyleSheet, TouchableOpacity} from "react-native";
import TestRenderer, {act} from "react-test-renderer";

jest.mock("../../../src/utility/Analytics", () => ({
    __esModule: true,
    screenRenderStart: () => 0,
    logScreenEvent: () => {},
}));

import AppliedFiltersV2 from "../../../src/views/filter/AppliedFiltersV2";
import ServiceContext from "../../../src/framework/context/ServiceContext";
import MessageService from "../../../src/service/MessageService";

describe("AppliedFiltersV2", () => {
    it("the clear control takes its own size, so it shows and takes taps above a full page, outside a scroll view", () => {
        const dispatch = jest.fn();
        const context = {
            getService: (Class) => Class === MessageService ? {getI18n: () => ({t: (key) => key})} : {},
            getStore: () => ({getState: () => ({}), subscribe: () => () => {}, dispatch}),
        };
        const props = {
            dashboardUUID: "d1",
            hasFiltersSet: true,
            dashboard: {getFilter: () => ({name: "Village"})},
            selectedFilterValues: {f1: "Kharoli"},
            filterConfigs: {f1: {getInputDataType: () => "Text", type: "Text"}},
            filterUUIDsToIgnore: [],
            postClearAction: jest.fn(),
        };
        let tr;
        act(() => {
            tr = TestRenderer.create(<ServiceContext.Provider value={context}><AppliedFiltersV2 {...props}/></ServiceContext.Provider>);
        });
        const clear = tr.root.findByType(TouchableOpacity);
        // flex grows from a zero height. In a scroll view the content sizes it; outside one, above a full page that
        // takes the rest of the screen, it gets no room and is drawn at zero height.
        expect(StyleSheet.flatten(clear.props.style).flex).toBeUndefined();
        act(() => clear.props.onPress());
        expect(props.postClearAction).toHaveBeenCalledTimes(1);
    });
});
