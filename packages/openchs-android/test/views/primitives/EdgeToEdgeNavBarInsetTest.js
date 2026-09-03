import React from "react";
import {Platform} from "react-native";
import renderer from "react-test-renderer";
import {SafeAreaInsetsContext} from "react-native-safe-area-context";
import {useEdgeToEdgeNavBarInset} from "../../../src/views/primitives/Distances";

// The react-native jest preset resolves Platform to the iOS build, so both fields are overridden.
function onPlatform(os, version, block) {
    const original = ['OS', 'Version'].map((field) => [field, Object.getOwnPropertyDescriptor(Platform, field)]);
    Object.defineProperty(Platform, 'OS', {configurable: true, get: () => os});
    Object.defineProperty(Platform, 'Version', {configurable: true, get: () => version});
    try {
        return block();
    } finally {
        original.forEach(([field, descriptor]) => Object.defineProperty(Platform, field, descriptor));
    }
}

function insetUnder(os, osVersion, safeAreaInsets) {
    let observed;
    const Probe = () => {
        observed = useEdgeToEdgeNavBarInset();
        return null;
    };
    onPlatform(os, osVersion, () => renderer.create(
        <SafeAreaInsetsContext.Provider value={safeAreaInsets}>
            <Probe/>
        </SafeAreaInsetsContext.Provider>
    ));
    return observed;
}

const threeButtonNav = {top: 24, bottom: 48, left: 0, right: 0};

describe('useEdgeToEdgeNavBarInset', () => {
    it('reserves the measured navigation bar strip on Android 16, which cannot opt out of edge-to-edge', () => {
        expect(insetUnder('android', 36, threeButtonNav)).toBe(48);
    });

    it('reserves the smaller gesture-navigation strip when that is what the device reports', () => {
        expect(insetUnder('android', 36, {top: 24, bottom: 24, left: 0, right: 0})).toBe(24);
    });

    it('reserves nothing on Android 15, where styles.xml still opts out and the window is already inset', () => {
        expect(insetUnder('android', 35, threeButtonNav)).toBe(0);
    });

    it('reserves nothing when no safe area provider is above it, rather than throwing', () => {
        expect(insetUnder('android', 36, null)).toBe(0);
    });
});
