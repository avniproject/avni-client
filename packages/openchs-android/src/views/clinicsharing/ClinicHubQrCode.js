import React from "react";
import {StyleSheet, Text, View} from "react-native";
import QRCode from "react-native-qrcode-svg";

// The hub's join code (avni-client#2173), with the network name and password written underneath for phones below
// Android 10, which join in Wi-Fi settings first. The labels come translated from the screen that shows this.
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
