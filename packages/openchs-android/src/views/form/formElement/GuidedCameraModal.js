import React, {useRef, useState, useEffect} from "react";
import {Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator} from "react-native";
import {Camera, useCameraDevice, useCameraPermission} from "react-native-vision-camera";

const styles = StyleSheet.create({
    fill: {...StyleSheet.absoluteFillObject, backgroundColor: "black"},
    center: {flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "black"},
    err: {color: "#ff6b6b", fontSize: 16, textAlign: "center", marginBottom: 16},
    controls: {position: "absolute", bottom: 0, left: 0, right: 0, height: 120, alignItems: "center", justifyContent: "center", flexDirection: "row"},
    shutter: {width: 74, height: 74, borderRadius: 37, backgroundColor: "white", borderWidth: 4, borderColor: "#00e0ff"},
    shutterDisabled: {backgroundColor: "#888", borderColor: "#555"},
    close: {position: "absolute", top: 40, left: 20, padding: 8},
    closeText: {color: "white", fontSize: 22},
    errorBanner: {position: "absolute", top: 40, alignSelf: "center", backgroundColor: "rgba(0,0,0,0.7)", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8},
    btn: {marginTop: 16, backgroundColor: "#00e0ff", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 6},
    btnText: {color: "black", fontWeight: "700"},
});

export default function GuidedCameraModal({visible, onClose, onCapture, captureError}) {
    const cameraRef = useRef(null);
    const device = useCameraDevice("back");
    const {hasPermission, requestPermission} = useCameraPermission();
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (visible && !hasPermission) requestPermission();
        if (visible) setError(null);
    }, [visible, hasPermission]);

    const flashReady = !!device && device.hasFlash === true;

    const capture = async () => {
        if (!flashReady || busy) return;
        setBusy(true);
        setError(null);
        try {
            const photo = await cameraRef.current.takePhoto({flash: "on"});
            setBusy(false);
            onCapture(photo.path);
        } catch (e) {
            setBusy(false);
            setError(`Capture failed: ${e && e.message ? e.message : e}. Please retake.`);
        }
    };

    const renderBlocking = (message) => (
        <View style={styles.center}>
            <Text style={styles.err}>{message}</Text>
            <TouchableOpacity style={styles.btn} onPress={onClose}><Text style={styles.btnText}>Close</Text></TouchableOpacity>
        </View>
    );

    let body;
    if (!device) body = renderBlocking("No back camera available on this device.");
    else if (!hasPermission) body = renderBlocking("Camera permission is required.");
    else if (!device.hasFlash) body = renderBlocking("This device has no flash. Guided capture requires a flash and is blocked.");
    else {
        body = (
            <View style={styles.fill}>
                <Camera ref={cameraRef} style={StyleSheet.absoluteFill} device={device} isActive={visible} photo={true} />
                <TouchableOpacity style={styles.close} onPress={onClose}><Text style={styles.closeText}>✕</Text></TouchableOpacity>
                {(error || captureError) && (
                    <View style={styles.errorBanner}><Text style={styles.err}>{error || captureError}</Text></View>
                )}
                <View style={styles.controls}>
                    <TouchableOpacity
                        onPress={capture}
                        disabled={busy}
                        style={[styles.shutter, (!flashReady || busy) && styles.shutterDisabled]}>
                        {busy && <ActivityIndicator color="#000" style={StyleSheet.absoluteFill} />}
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
            {body}
        </Modal>
    );
}
