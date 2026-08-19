import React, {useRef, useState, useEffect} from "react";
import {Modal, View, Text, Image, TouchableOpacity, StyleSheet, ActivityIndicator} from "react-native";
import {Camera, useCameraDevice} from "react-native-vision-camera";
import fs from 'react-native-fs';
import General from "../../../utility/General";

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
    reviewControls: {position: "absolute", bottom: 0, left: 0, right: 0, height: 120, alignItems: "center", justifyContent: "space-around", flexDirection: "row", paddingHorizontal: 24},
    reviewBtn: {paddingHorizontal: 24, paddingVertical: 12, borderRadius: 6, backgroundColor: "rgba(255,255,255,0.18)"},
    reviewBtnPrimary: {paddingHorizontal: 24, paddingVertical: 12, borderRadius: 6, backgroundColor: "#00e0ff", minWidth: 120, alignItems: "center"},
    reviewBtnText: {color: "white", fontSize: 16, fontWeight: "700"},
    reviewBtnPrimaryText: {color: "black", fontSize: 16, fontWeight: "700"},
});

const fileUri = (p) => (p.startsWith("file://") ? p : `file://${p}`);

// Camera permission is requested (and denial handled with the standard DevicePermissions dialog)
// before this modal opens — see MediaFormElement.openGuidedCamera — so it only renders with permission granted.
export default function GuidedCameraModal({visible, onClose, onCapture, labels}) {
    const cameraRef = useRef(null);
    const device = useCameraDevice("back");
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);
    // The just-captured photo, held for review; the user confirms (Use photo) or discards (Retake)
    // before anything is saved — mirrors the system-camera picker's confirm/retake step.
    const [preview, setPreview] = useState(null);
    // Bumped on every open, close, and unmount; a capture that outlives its session (e.g. a hung
    // takePhoto the user closed out of) is discarded instead of writing or touching state.
    const sessionRef = useRef(0);
    // Synchronous double-tap guard; `busy` state lags a render behind and won't stop a second tap in the same tick.
    const busyRef = useRef(false);
    // Path of the full-res capture currently held for review. takePhoto writes it to disk, so it must
    // be unlinked on every discard path (Retake, close, unmount) or it leaks one file per discard.
    const previewPathRef = useRef(null);

    const discardPreview = () => {
        if (previewPathRef.current) fs.unlink(previewPathRef.current).catch(() => {});
        previewPathRef.current = null;
        setPreview(null);
    };

    // The modal stays mounted while the element renders, so per-session state is reset on open.
    useEffect(() => {
        if (visible) {
            sessionRef.current++;
            busyRef.current = false;
            setError(null);
            setBusy(false);
            discardPreview();
        }
    }, [visible]);

    useEffect(() => () => {
        sessionRef.current++;
        if (previewPathRef.current) fs.unlink(previewPathRef.current).catch(() => {});
    }, []);

    const handleClose = () => {
        discardPreview();
        sessionRef.current++;
        onClose();
    };

    const capture = async () => {
        if (busyRef.current) return;
        busyRef.current = true;
        const session = sessionRef.current;
        setBusy(true);
        setError(null);
        try {
            const photo = await cameraRef.current.takePhoto({flash: "on"});
            if (sessionRef.current !== session) {
                fs.unlink(photo.path).catch(() => {}); // captured after the session ended — discard it
                return;
            }
            previewPathRef.current = photo.path;
            setPreview(photo); // review before committing — no asset is saved yet
        } catch (e) {
            General.logError('GuidedCameraModal', e);
            if (sessionRef.current !== session) return;
            setError(labels.captureFailed);
        } finally {
            busyRef.current = false;
            if (sessionRef.current === session) setBusy(false);
        }
    };

    const usePhoto = async () => {
        if (busyRef.current || !preview) return;
        busyRef.current = true;
        const session = sessionRef.current;
        setBusy(true);
        setError(null);
        try {
            await onCapture(preview.path); // resize + save + close; onGuidedCapture unlinks the original on success
            if (sessionRef.current !== session) return;
            previewPathRef.current = null; // consumed — ownership passed to onGuidedCapture
        } catch (e) {
            General.logError('GuidedCameraModal', e);
            if (sessionRef.current !== session) return;
            setError(labels.captureFailed); // keep the preview so the user can retake; the file is still ours to clean up
        } finally {
            busyRef.current = false;
            if (sessionRef.current === session) setBusy(false);
        }
    };

    const renderBlocking = (message) => (
        <View style={styles.center}>
            <Text style={styles.err}>{message}</Text>
            <TouchableOpacity style={styles.btn} onPress={handleClose}><Text style={styles.btnText}>{labels.close}</Text></TouchableOpacity>
        </View>
    );

    let body;
    if (!device) body = renderBlocking(labels.noBackCamera);
    else if (!device.hasFlash) body = renderBlocking(labels.flashRequired);
    else {
        body = (
            <View style={styles.fill}>
                <Camera ref={cameraRef} style={StyleSheet.absoluteFill} device={device} isActive={visible && !preview} photo={true} />
                {preview && (
                    <Image source={{uri: fileUri(preview.path)}} style={StyleSheet.absoluteFill} resizeMode="contain" />
                )}
                <TouchableOpacity style={styles.close} onPress={handleClose}><Text style={styles.closeText}>✕</Text></TouchableOpacity>
                {!preview && error && (
                    <View style={styles.errorBanner} pointerEvents="none"><Text style={styles.err}>{error}</Text></View>
                )}
                {preview ? (
                    <View style={styles.reviewControls}>
                        <TouchableOpacity style={styles.reviewBtn} disabled={busy} onPress={discardPreview}>
                            <Text style={styles.reviewBtnText}>{labels.retake}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.reviewBtnPrimary} disabled={busy} onPress={usePhoto}>
                            {busy ? <ActivityIndicator color="#000" /> : <Text style={styles.reviewBtnPrimaryText}>{labels.usePhoto}</Text>}
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.controls}>
                        <TouchableOpacity
                            onPress={capture}
                            disabled={busy}
                            style={[styles.shutter, busy && styles.shutterDisabled]}>
                            {busy && <ActivityIndicator color="#000" style={StyleSheet.absoluteFill} />}
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    }

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={handleClose} statusBarTranslucent>
            {body}
        </Modal>
    );
}
