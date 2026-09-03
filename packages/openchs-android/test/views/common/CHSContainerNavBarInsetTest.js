import React from "react";
import {Platform, View} from "react-native";
import renderer from "react-test-renderer";
import {SafeAreaInsetsContext} from "react-native-safe-area-context";

// NativeBaseProvider renders its own SafeAreaProvider, which withholds children until native
// reports insets — something that never happens under jest. Stubbing it lets the container's own
// styling be asserted while still supplying insets through the context it would have provided.
jest.mock("native-base", () => {
    const React = require("react");
    const {View} = require("react-native");
    return {
        NativeBaseProvider: ({children}) => children,
        Box: ({children, ...props}) => React.createElement(View, props, children)
    };
});

const CHSContainer = require("../../../src/views/common/CHSContainer").default;

function containerStyleOn(os, osVersion, safeAreaInsets, containerStyle) {
    const original = ['OS', 'Version'].map((field) => [field, Object.getOwnPropertyDescriptor(Platform, field)]);
    Object.defineProperty(Platform, 'OS', {configurable: true, get: () => os});
    Object.defineProperty(Platform, 'Version', {configurable: true, get: () => osVersion});
    try {
        const tree = renderer.create(
            <SafeAreaInsetsContext.Provider value={safeAreaInsets}>
                <CHSContainer style={containerStyle}><View/></CHSContainer>
            </SafeAreaInsetsContext.Provider>
        );
        return tree.root.findAllByType(View)[0].props.style;
    } finally {
        original.forEach(([field, descriptor]) => Object.defineProperty(Platform, field, descriptor));
    }
}

const threeButtonNav = {top: 24, bottom: 48, left: 0, right: 0};

describe('CHSContainer navigation bar inset', () => {
    // Padding would not do: Yoga positions absolutely anchored children — the filter Apply button,
    // the landing bottom bar — against the padding box, so only a border moves them off the edge.
    it('reserves the navigation bar strip as a transparent bottom border on Android 16', () => {
        expect(containerStyleOn('android', 36, threeButtonNav)).toEqual(
            [undefined, {borderBottomWidth: 48, borderBottomColor: 'transparent'}]);
    });

    it('reserves nothing on Android 15, which still opts out of edge-to-edge', () => {
        expect(containerStyleOn('android', 35, threeButtonNav)).toEqual(
            [undefined, {borderBottomWidth: 0, borderBottomColor: 'transparent'}]);
    });

    it('keeps the style the screen asked for', () => {
        expect(containerStyleOn('android', 36, threeButtonNav, {backgroundColor: 'white'})).toEqual(
            [{backgroundColor: 'white'}, {borderBottomWidth: 48, borderBottomColor: 'transparent'}]);
    });
});
