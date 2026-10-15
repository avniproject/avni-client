import React, {useEffect, useRef} from "react";
import {StyleSheet, View} from "react-native";
import {Camera, useCameraDevice, useCameraPermission, useCodeScanner} from "react-native-vision-camera";
import {parseJoinPayload} from "../../framework/clinicsharing/ClinicJoinPayload";

// The scanner model ships in the app (VisionCamera_enableCodeScanner), so a phone that has never been online can scan.
const ClinicHubScanner = ({onScanned, isActive = true, style}) => {
    const device = useCameraDevice("back");
    const {hasPermission, requestPermission} = useCameraPermission();
    const lastValue = useRef(null);

    useEffect(() => {
        if (!hasPermission) requestPermission();
    }, [hasPermission]);

    // The camera reports a code on every frame it is in view; a fresh activation is a fresh attempt.
    useEffect(() => {
        if (isActive) lastValue.current = null;
    }, [isActive]);

    const codeScanner = useCodeScanner({
        codeTypes: ["qr"],
        onCodeScanned: (codes) => {
            const value = codes.length > 0 ? codes[0].value : null;
            if (!value || value === lastValue.current) return;
            lastValue.current = value;
            onScanned(parseJoinPayload(value), value);
        },
    });

    if (!device || !hasPermission) return <View style={[styles.camera, style]}/>;
    return <Camera style={[styles.camera, style]} device={device} isActive={isActive} codeScanner={codeScanner}/>;
};

const styles = StyleSheet.create({
    camera: {width: "100%", aspectRatio: 1, backgroundColor: "black"},
});

export default ClinicHubScanner;
