import React from "react";
import {Platform, StatusBar} from "react-native";
import renderer from "react-test-renderer";
import {SafeAreaInsetsContext} from "react-native-safe-area-context";
import {edgeToEdgeStatusBarInset, useEdgeToEdgeNavBarInset} from "../../../src/views/primitives/Distances";

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

// The app bars read this through SafeAreaInsetsContext.Consumer, being class components.
describe('edgeToEdgeStatusBarInset', () => {
    it('reserves the measured top inset on Android 16', () => {
        expect(onPlatform('android', 36, () => edgeToEdgeStatusBarInset(threeButtonNav))).toBe(24);
    });

    // The measured inset spans the status bar and the display cutout, so a cutout taller than the bar
    // is covered — StatusBar.currentHeight reports only the bar and would let the title ride into it.
    it('reserves the cutout when it is taller than the status bar', () => {
        expect(onPlatform('android', 36, () => edgeToEdgeStatusBarInset({top: 48, bottom: 48, left: 0, right: 0}))).toBe(48);
    });

    // Live window value, not a resource height: in the lower half of a split screen, or with the bar
    // hidden, there is no status bar to clear and a resource height would leave a phantom gap.
    it('reserves nothing when the window reports no top inset', () => {
        expect(onPlatform('android', 36, () => edgeToEdgeStatusBarInset({top: 0, bottom: 0, left: 0, right: 0}))).toBe(0);
    });

    it('reserves nothing on Android 15, which still opts out of edge-to-edge', () => {
        expect(onPlatform('android', 35, () => edgeToEdgeStatusBarInset(threeButtonNav))).toBe(0);
        expect(onPlatform('ios', 36, () => edgeToEdgeStatusBarInset(threeButtonNav))).toBe(0);
    });

    // A header rendered with no provider above it keeps the old status-bar height rather than colliding.
    it('falls back to the status bar height when there is no provider', () => {
        StatusBar.currentHeight = 24;
        expect(onPlatform('android', 36, () => edgeToEdgeStatusBarInset(null))).toBe(24);
    });
});
