import React from "react";
import {StyleSheet, Text, View} from "react-native";
import QRCode from "react-native-qrcode-svg";

// Network name and password are written out for phones below Android 10, which join in Wi-Fi settings first.
const ClinicHubQrCode = ({qrValue, ssid, passphrase, networkLabel, passwordLabel, size = 240}) => (
    <View style={styles.container}>
        <QRCode value={qrValue} size={size} ecl="M" quietZone={16} backgroundColor="white"/>
        <Text style={styles.detail} selectable>{networkLabel}: {ssid}</Text>
        <Text style={styles.detail} selectable>{passwordLabel}: {passphrase}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: {alignItems: "center", paddingVertical: 16},
    detail: {fontSize: 16, marginTop: 8},
});

export default ClinicHubQrCode;
