// Spike #222 — throwaway scaffolding. Guided in-app camera for a forced-flash, per-row
// overlay capture inside an RQG row. NOT production code; gated by a form-element keyValue
// (`guidedCamera`) so it only affects the target concept and stays config-driven.
import React, {useRef, useState, useEffect} from "react";
import {Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Image} from "react-native";
import {Camera, useCameraDevice, useCameraPermission} from "react-native-vision-camera";

const MAX_OVERLAY_ROW = 14; // Option (a): no overlay/reckoner past row 14

// ⚠️ SPIKE #222 DEV-ONLY — in-modal toggles to exercise A3 (no-flash block) and A4 (capture
// failure) on a device that HAS a working flash. Delete before merge.
const SPIKE_DEV_CONTROLS = true;

const styles = StyleSheet.create({
    fill: {...StyleSheet.absoluteFillObject, backgroundColor: "black"},
    center: {flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "black"},
    msg: {color: "white", fontSize: 16, textAlign: "center", marginBottom: 16},
    err: {color: "#ff6b6b", fontSize: 16, textAlign: "center", marginBottom: 16},
    overlayBox: {
        position: "absolute", top: "18%", left: "8%", right: "8%", bottom: "26%",
        borderColor: "#00e0ff", borderWidth: 2, borderRadius: 8,
    },
    banner: {position: "absolute", top: 40, alignSelf: "center", backgroundColor: "rgba(0,0,0,0.55)", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16},
    bannerText: {color: "white", fontSize: 15, fontWeight: "600"},
    controls: {position: "absolute", bottom: 0, left: 0, right: 0, height: 120, alignItems: "center", justifyContent: "center", flexDirection: "row"},
    shutter: {width: 74, height: 74, borderRadius: 37, backgroundColor: "white", borderWidth: 4, borderColor: "#00e0ff"},
    shutterDisabled: {backgroundColor: "#888", borderColor: "#555"},
    close: {position: "absolute", top: 40, left: 20, padding: 8},
    closeText: {color: "white", fontSize: 22},
    btn: {marginTop: 16, backgroundColor: "#00e0ff", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 6},
    btnText: {color: "black", fontWeight: "700"},
    devBar: {position: "absolute", top: 84, alignSelf: "center", flexDirection: "row"},
    devBtn: {backgroundColor: "rgba(255,255,255,0.15)", borderColor: "#00e0ff", borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, marginHorizontal: 4},
    devBtnOn: {backgroundColor: "#ff8c00"},
    devTxt: {color: "white", fontSize: 12, fontWeight: "600"},
    overlayImage: {position: "absolute", top: "18%", left: "8%", right: "8%", bottom: "26%", opacity: 0.35},
    reckoner: {position: "absolute", bottom: 132, alignSelf: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)", padding: 6, borderRadius: 8},
    reckonerLabel: {color: "#00e0ff", fontSize: 12, marginBottom: 4, fontWeight: "600"},
    reckonerImg: {width: 132, height: 132, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.06)"},
});

// Adapts vision-camera output to the image-picker response shape so the existing
// MediaFormElement.addMediaFromPicker pipeline (and the ONNX AI downstream) is unchanged.
export function toPickerResponse(photoPath, fileSize) {
    const uri = photoPath.startsWith("file://") ? photoPath : `file://${photoPath}`;
    return {assets: [{uri, fileName: uri.split("/").pop(), type: "image/jpeg", fileSize}]};
}

export default function GuidedCameraModal({visible, onClose, onCapture, questionGroupIndex, guideUri, rowCount = MAX_OVERLAY_ROW}) {
    const cameraRef = useRef(null);
    const device = useCameraDevice("back");
    const {hasPermission, requestPermission} = useCameraPermission();
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);
    const [devNoFlash, setDevNoFlash] = useState(false);
    const [devFailCapture, setDevFailCapture] = useState(false);

    useEffect(() => {
        if (visible && !hasPermission) requestPermission();
        if (visible) setError(null);
    }, [visible, hasPermission]);

    const rowNo = (questionGroupIndex ?? 0) + 1;
    const withinOverlay = rowNo <= rowCount;
    // A3: capture is blocked unless the device has a usable flash (devNoFlash simulates a no-flash device).
    const flashReady = !devNoFlash && !!device && device.hasFlash === true;

    const capture = async () => {
        if (!flashReady || busy) return;
        setBusy(true);
        setError(null);
        try {
            if (devFailCapture) throw new Error("SPIKE forced capture failure");
            // A2: flash forced 'on', non-disableable (no toggle exposed).
            const photo = await cameraRef.current.takePhoto({flash: "on"});
            setBusy(false);
            onCapture(photo.path, photo.metadata?.["{Exif}"] || null);
        } catch (e) {
            // A4: capture failure blocks + surfaces an error with a retake, never returns a broken asset.
            setBusy(false);
            setError(`Capture failed: ${e?.message || e}. Retake.`);
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
    else if (!device.hasFlash || devNoFlash) body = renderBlocking("This device has no flash. Guided capture requires a flash and is blocked."); // A3
    else {
        body = (
            <View style={styles.fill}>
                <Camera ref={cameraRef} style={StyleSheet.absoluteFill} device={device} isActive={visible} photo={true} />
                {withinOverlay && (guideUri
                    // C1: per-row overlay from config (the indexed Concept.media guide), faint over the viewfinder.
                    ? <Image source={{uri: guideUri}} style={styles.overlayImage} resizeMode="contain" pointerEvents="none" />
                    : <View style={styles.overlayBox} pointerEvents="none" />)}
                {withinOverlay && guideUri && (
                    // D2: per-row static reckoner (same indexed asset), shown above the capture control.
                    <View style={styles.reckoner} pointerEvents="none">
                        <Text style={styles.reckonerLabel}>Reference — site {rowNo}</Text>
                        <Image source={{uri: guideUri}} style={styles.reckonerImg} resizeMode="contain" />
                    </View>
                )}
                <View style={styles.banner} pointerEvents="none">
                    <Text style={styles.bannerText}>{withinOverlay ? `Site ${rowNo} of ${rowCount}` : `Extra image (row ${rowNo})`}</Text>
                </View>
                <TouchableOpacity style={styles.close} onPress={onClose}><Text style={styles.closeText}>✕</Text></TouchableOpacity>
                {error && (
                    <View style={styles.banner}><Text style={styles.err}>{error}</Text></View>
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
            <View style={{flex: 1, backgroundColor: "black"}}>
                {body}
                {SPIKE_DEV_CONTROLS && (
                    <View style={styles.devBar}>
                        <TouchableOpacity style={[styles.devBtn, devNoFlash && styles.devBtnOn]} onPress={() => setDevNoFlash(v => !v)}>
                            <Text style={styles.devTxt}>A3 no-flash: {devNoFlash ? "ON" : "off"}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.devBtn, devFailCapture && styles.devBtnOn]} onPress={() => setDevFailCapture(v => !v)}>
                            <Text style={styles.devTxt}>A4 fail: {devFailCapture ? "ON" : "off"}</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </Modal>
    );
}
